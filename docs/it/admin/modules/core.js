/* ================== CONFIGURAZIONE INIZIALE ================== */

// Debug globale per catturare chiamate API con undefined
const originalAjax = $.ajax;
$.ajax = function(options) {
  if (options.url && options.url.includes('undefined')) {
    console.error("❌ CHIAMATA API CON UNDEFINED:", options.url);
    console.error("❌ OPTIONS:", options);
    console.trace("❌ Stack trace:");
    debugger; // Ferma l'esecuzione per debug
    return Promise.reject("API call with undefined parameters blocked");
  }
  console.log("✅ API Call:", options.url);
  return originalAjax.call(this, options);
};

// Variabili globali necessarie - rese accessibili a livello window per index.html
let editor, currentFileContent = null;
let currentFilePath = null, currentSha = null;

// Variabili globali condivise tra app.js e index.html
window.currentUsername = null;
window.currentRepo = null; 
window.currentToken = null;
window.branch = "main";
window.cachedImages = [];
window.pendingChanges = [];
window.allFilesCache = {}; // Cache per tutti i file scaricati
window.ghPagesVersions = [];

// Variabili locali
let lastLoadedFiles = [];
let selectedFileToDelete = null, selectedImageToDelete = null;

// =================== AUTO-SAVE SYSTEM ===================
let autoSaveTimer = null;
let lastSavedContent = null;
const AUTO_SAVE_DELAY = 60000; // 1 minuto in millisecondi

// Resetta il timer di auto-save
function resetAutoSaveTimer() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  autoSaveTimer = setTimeout(() => {
    performAutoSave();
  }, AUTO_SAVE_DELAY);
}

// Esegue il salvataggio automatico nello staging
function performAutoSave() {
  if (!editor || !currentFilePath) {
    console.log("⏭️ Auto-save: nessun file aperto");
    return;
  }
  
  const currentContent = editor.getMarkdown();
  
  // Verifica se ci sono modifiche
  if (currentContent === lastSavedContent || currentContent === currentFileContent) {
    console.log("⏭️ Auto-save: nessuna modifica rilevata");
    return;
  }
  
  console.log("💾 Auto-save: salvataggio automatico in corso...");
  
  // Salva nello staging
  if (window.stageFileLocally) {
    const isNewFile = !currentSha;
    window.stageFileLocally(currentFilePath, currentContent, currentSha, isNewFile);
    lastSavedContent = currentContent;
    
    // Mostra notifica temporanea
    showAutoSaveNotification();
    
    console.log("✅ Auto-save completato:", currentFilePath);
  }
}

// Mostra una notifica di auto-save
function showAutoSaveNotification() {
  const notification = $(`
    <div style="position: fixed; top: 80px; right: 20px; background: #28a745; color: white; 
                padding: 12px 20px; border-radius: 8px; z-index: 9999; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease-out;">
      💾 Modifiche salvate automaticamente nello staging
    </div>
  `);
  
  $('body').append(notification);
  
  // Rimuovi dopo 3 secondi
  setTimeout(() => {
    notification.fadeOut(300, function() {
      $(this).remove();
    });
  }, 3000);
}

// Annulla il timer quando necessario
function cancelAutoSaveTimer() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

// Helper per accesso diretto alle variabili globali window
function getCurrentCredentials() {
  return {
    username: window.currentUsername,
    repo: window.currentRepo,
    token: window.currentToken
  };
}

// Funzioni utili per encoding
function decodeBase64Utf8(base64Str) {
  const binary = atob(base64Str.replace(/\s/g, ""));
  return new TextDecoder("utf-8").decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

function encodeUtf8Base64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// Aggiorna le immagini nell'anteprima dell'editor - usa sempre cache
function updatePreviewImages() {
  // PREVENZIONE: Sostituisce subito i src problematici prima del rendering
  setTimeout(() => {
    $(".editormd-preview-container img").each(function() {
      const $img = $(this);
      const src = $img.attr("src");
      
      // ⚠️ BLOCCO CHIAMATE LOCALHOST: Se è un path relativo, sostituiscilo immediatamente
      if (src && (src.startsWith("images/") || src.startsWith("/images/") || 
                  src.startsWith("admin/images/") || src.startsWith("/admin/images/") ||
                  (!src.startsWith("http") && !src.startsWith("data:")))) {
        
        console.log(`🔍 Intercetto path relativo: ${src}`);
        
        // Estrai il nome file dai vari pattern di path
        let filename = '';
        if (src.includes('/')) {
          filename = src.split('/').pop(); // Prende l'ultima parte dopo '/'
        } else {
          filename = src;
        }
        
        // Cerca nella cache per nome file
        const found = window.cachedImages?.find(img => {
          return img.name === filename || 
                 src === img.local || 
                 src.endsWith("/" + img.name) || 
                 src.includes(img.name) ||
                 img.local.endsWith(src);
        });
        
        if (found?.dataUrl) {
          // Usa l'immagine dalla cache (dataUrl) - IMMEDIATO
          $img.attr("src", found.dataUrl);
          console.log(`🖼️ Cache hit: ${filename} -> ${found.name}`);
        } else if (window.currentUsername && window.currentRepo) {
          // Fallback: GitHub raw URL - IMMEDIATO
          // Mappa admin/images/ -> images/extract/media/
          let githubPath = src;
          if (src.startsWith("admin/images/") || src.startsWith("/admin/images/")) {
            githubPath = src.replace(/^\/?(admin\/)?images\//, "images/extract/media/");
          } else if (src.startsWith("images/")) {
            githubPath = src.replace(/^images\//, "images/extract/media/");
          }
          
          const cleanPath = githubPath.replace(/^\/+/, "");
          const githubUrl = `https://raw.githubusercontent.com/${window.currentUsername}/${window.currentRepo}/main/overrides/assets/${cleanPath}`;
          $img.attr("src", githubUrl);
          console.log(`⚠️ Cache miss, GitHub fallback: ${src} -> ${githubUrl}`);
        } else {
          // Nessun fallback disponibile - mostra placeholder
          $img.attr("src", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='50'%3E%3Ctext x='10' y='25' fill='%23999'%3EImmagine non trovata%3C/text%3E%3C/svg%3E");
          console.log(`❌ Immagine non disponibile: ${src}`);
        }
      }
    });
    
    // 🖼️ Converti alt text in didascalie (figcaption)
    convertImageCaptions();
    
    // 🔒 Nascondi i tag anchor vuoti
    hideEmptyAnchors();
    
  }, 100); // Ridotto timeout per essere più veloce
}

// Converte l'alt text delle immagini in didascalie visibili
function convertImageCaptions() {
  $(".editormd-preview-container img").each(function() {
    const $img = $(this);
    const alt = $img.attr("alt");
    
    // Se l'immagine ha un alt text e non è già dentro un figure
    if (alt && alt.trim() !== "" && !$img.parent().is("figure")) {
      // Verifica se non c'è già una didascalia
      if ($img.next("figcaption").length === 0 && $img.next("em").length === 0) {
        // Crea una didascalia sotto l'immagine
        $img.after(`<figcaption style="text-align: center; font-style: italic; color: #666; margin-top: 8px; font-size: 0.9em;">${alt}</figcaption>`);
      }
    }
  });
}

// Nasconde i tag anchor vuoti <a id="xxx"></a>
function hideEmptyAnchors() {
  $(".editormd-preview-container a[id]").each(function() {
    const $anchor = $(this);
    // Nascondi se è vuoto o non ha href
    if ($anchor.is(":empty") || !$anchor.attr("href")) {
      $anchor.hide();
    }
  });
}

// Inizializzazione editor
function initEditor() {
  editor = editormd("editor", {
    width: "100%",
    height: "100%",
    path: "https://cdn.jsdelivr.net/npm/editor.md@1.5.0/lib/",
    toolbar: true,
    imageUpload: false,
    htmlDecode: true,
    syncScrolling: true,
    setMarkdown: "# Benvenuto nel tuo editor Markdown",
    onload: updatePreviewImages,
    onchange: function() {
      updatePreviewImages();
      // 🔄 Resetta il timer di auto-save ad ogni modifica
      resetAutoSaveTimer();
    }
  });
}

// Funzione per gestire il click del bottone Start
function handleStartClick() {
  // Leggi i valori dai campi di input
  const username = $("#username").val();
  const repo = $("#repo").val(); 
  const token = $("#token").val();
  
  if (!username || !repo || !token) {
    return alert("Compila tutti i campi!");
  }
  
  // Imposta le variabili globali accessibili da index.html
  window.currentUsername = username;
  window.currentRepo = repo;
  window.currentToken = token;
  window.ghPagesVersions = [];
  
  console.log("✅ Variabili window impostate:", { 
    username: window.currentUsername, 
    repo: window.currentRepo, 
    token: window.currentToken ? "***" : "undefined" 
  });
  
  // Nascondi configuratore e mostra editor
  $("#configurator").hide(); 
  $("#editor,#file-list").show(); 
  
  // Mostra menu superiore e aggiorna layout
  $("#top-menu").show();
  $("body").addClass("editor-active");
  
  // Inizializza editor e carica file
  initEditor(); 
  loadFiles(username, repo, token);
  
  // Carica immediatamente tutte le immagini in cache
  console.log("🖼️ Avvio caricamento cache immagini...");
  loadImagesList(function(images) {
    console.log(`📦 Cache immagini pronta: ${images.length} immagini disponibili`);
    // Aggiorna eventuali immagini già visibili nell'editor
    updatePreviewImages();
  });
  
  // Controlla stato iniziale del repository
  checkRepoStatus();
  
  console.log("Configurazione completata:", { 
    currentUsername: window.currentUsername, 
    currentRepo: window.currentRepo 
  });
}

// =================== LOADING OVERLAY FUNCTIONS ===================
function showLoadingOverlay(message, progressText = '') {
  const overlay = $(`
    <div class="loading-overlay" id="loadingOverlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">${message}</div>
        <div class="loading-progress" id="loadingProgress">${progressText}</div>
      </div>
    </div>
  `);
  
  $('body').append(overlay);
  return overlay;
}

function updateLoadingProgress(progressText) {
  $('#loadingProgress').text(progressText);
}

function hideLoadingOverlay() {
  $('#loadingOverlay').remove();
}

// =================== IMAGE MODAL FUNCTIONS ===================
function showImageModal(imageSrc, imageName) {
  const modal = $(`
    <div class="image-modal-overlay" id="imageModalOverlay">
      <div class="image-modal-content">
        <button class="image-modal-close" onclick="hideImageModal()">×</button>
        <img src="${imageSrc}" alt="${imageName}" title="${imageName}">
      </div>
    </div>
  `);
  
  // Click overlay to close
  modal.on('click', function(e) {
    if (e.target === this) {
      hideImageModal();
    }
  });
  
  // Escape key to close
  $(document).on('keydown.imageModal', function(e) {
    if (e.key === 'Escape') {
      hideImageModal();
    }
  });
  
  $('body').append(modal);
}

function hideImageModal() {
  $('#imageModalOverlay').remove();
  $(document).off('keydown.imageModal');
}

// =================== TOAST NOTIFICATION SYSTEM ===================
function showToast(message, icon = '✅', duration = 3000) {
  // Crea il container se non esiste
  if (!$('.toast-container').length) {
    $('body').append('<div class="toast-container"></div>');
  }
  
  const toast = $(`
    <div class="toast">
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${message}</span>
    </div>
  `);
  
  $('.toast-container').append(toast);
  
  // Rimuovi automaticamente dopo la durata
  setTimeout(() => {
    toast.remove();
  }, duration);
}

// =================== SISTEMA DI STAGING LOCALE ===================
window.localStaging = {
  files: new Map(),      // path -> { content, originalSha, type: 'modified'|'new' }
  images: new Map(),     // filename -> { file, base64, type: 'new' }
  deleted: new Set()     // paths di file eliminati
};

// Aggiunge o aggiorna un file nello staging locale
function stageFileLocally(path, content, originalSha = null) {
  console.log("📝 Staging file locale:", path);
  
  const isNew = !originalSha;
  window.localStaging.files.set(path, {
    content: content,
    originalSha: originalSha,
    type: isNew ? 'new' : 'modified',
    timestamp: new Date().toISOString()
  });
  
  updateStagingUI();
  console.log(`✅ File ${isNew ? 'nuovo' : 'modificato'} in staging:`, path);
}

// Aggiunge un'immagine nello staging locale  
function stageImageLocally(filename, file, base64) {
  console.log("🖼️ Staging immagine locale:", filename);
  
  window.localStaging.images.set(filename, {
    file: file,
    base64: base64,
    type: 'new',
    size: file.size,
    timestamp: new Date().toISOString()
  });
  
  updateStagingUI();
  console.log("✅ Immagine in staging:", filename, `(${(file.size/1024).toFixed(1)} KB)`);
}

// Rimuove elemento dallo staging
function unstageItem(path, type) {
  if (type === 'file') {
    window.localStaging.files.delete(path);
    console.log("🗑️ Rimosso file da staging:", path);
  } else if (type === 'image') {
    window.localStaging.images.delete(path);
    console.log("🗑️ Rimossa immagine da staging:", path);
  } else if (type === 'deleted') {
    window.localStaging.deleted.delete(path);
    console.log("♻️ Rimossa eliminazione da staging:", path);
    // Ripristina il file nell'albero
    if (!lastLoadedFiles.includes(path)) {
      lastLoadedFiles.push(path);
      buildFileTree();
    }
  }
  updateStagingUI();
}

// Conta elementi nello staging
function getStagingCount() {
  return window.localStaging.files.size + window.localStaging.images.size + window.localStaging.deleted.size;
}

// Pulisce tutto lo staging
function clearStaging() {
  window.localStaging.files.clear();
  window.localStaging.images.clear();
  window.localStaging.deleted.clear();
  updateStagingUI();
  console.log("🧹 Staging pulito");
}

// Aggiorna l'interfaccia del pannello staging
function updateStagingUI() {
  const totalCount = getStagingCount();
  const $panel = $('#stagingPanel');
  const $count = $('#stagingCount');
  const $list = $('#stagingList');
  
  // Mostra/nasconde pannello
  if (totalCount > 0) {
    $panel.show();
  } else {
    $panel.hide();
    return;
  }
  
  // Aggiorna contatore
  $count.text(`${totalCount} elemento${totalCount > 1 ? 'i' : ''}`);
  
  // Costruisce lista elementi
  let html = '';
  
  // Files
  window.localStaging.files.forEach((fileData, path) => {
    const fileName = path.split('/').pop();
    const isNew = fileData.type === 'new';
    html += `
      <div class="staging-item">
        <span class="staging-item-icon">📄</span>
        <span class="staging-item-path" title="${path}">${fileName}</span>
        <span class="staging-item-type ${isNew ? 'new' : 'modified'}">
          ${isNew ? 'NEW' : 'MOD'}
        </span>
        <button class="staging-item-remove" onclick="unstageItem('${path}', 'file')" title="Rimuovi">×</button>
      </div>
    `;
  });
  
  // Images
  window.localStaging.images.forEach((imageData, filename) => {
    const sizeKB = (imageData.size / 1024).toFixed(1);
    html += `
      <div class="staging-item">
        <span class="staging-item-icon">🖼️</span>
        <span class="staging-item-path" title="${filename}">${filename}</span>
        <span class="staging-item-type new">NEW (${sizeKB} KB)</span>
        <button class="staging-item-remove" onclick="unstageItem('${filename}', 'image')" title="Rimuovi">×</button>
      </div>
    `;
  });
  
  // Deleted files
  window.localStaging.deleted.forEach(path => {
    const fileName = path.split('/').pop();
    html += `
      <div class="staging-item">
        <span class="staging-item-icon">🗑️</span>
        <span class="staging-item-path" title="${path}">${fileName}</span>
        <span class="staging-item-type deleted">DELETE</span>
        <button class="staging-item-remove" onclick="unstageItem('${path}', 'deleted')" title="Rimuovi">×</button>
      </div>
    `;
  });
  
  $list.html(html);
}

// Commit batch di tutti gli elementi nello staging
async function commitAllStaging() {
  // Salva automaticamente il file aperto prima del commit
  if (window.currentFilePath && editor) {
    const currentContent = editor.getMarkdown();
    const originalContent = window.lastSavedContent || "";
    
    // Solo se ci sono modifiche non salvate
    if (currentContent !== originalContent) {
      console.log("💾 Salvataggio automatico del file aperto prima del commit...");
      saveFile(); // Salva il file corrente nello staging
      // Piccola pausa per permettere al salvataggio di completarsi
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const fileCount = window.localStaging.files.size;
  const imageCount = window.localStaging.images.size;
  const deletedCount = window.localStaging.deleted.size;
  const totalCount = fileCount + imageCount + deletedCount;
  
  if (totalCount === 0) {
    alert("Nessuna modifica nello staging da committare.");
    return;
  }
  
  const confirmMsg = `🚀 Commit di ${totalCount} elementi:\n• ${fileCount} file\n• ${imageCount} immagini\n• ${deletedCount} eliminazioni\n\nProcedere?`;
  if (!confirm(confirmMsg)) return;
  
  console.log("🚀 Avvio commit batch staging (singolo push)...");
  showLoadingOverlay("🚀 Commit in corso...", "Preparazione dati...");

  const branch = window.branch || "main";
  const apiBase = `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}`;
  const stagedFiles = Array.from(window.localStaging.files.entries());
  const stagedImages = Array.from(window.localStaging.images.entries());
  const stagedDeleted = Array.from(window.localStaging.deleted);

  try {
    updateLoadingProgress("Recupero stato repository...");
    const refData = await githubApiRequest("GET", `${apiBase}/git/ref/heads/${branch}`);
    const latestCommitSha = refData?.object?.sha;
    if (!latestCommitSha) throw new Error("Commit principale non trovato");

    updateLoadingProgress("Recupero commit di base...");
    const commitData = await githubApiRequest("GET", `${apiBase}/git/commits/${latestCommitSha}`);
    const baseTreeSha = commitData?.tree?.sha;
    if (!baseTreeSha) throw new Error("Tree di base non disponibile");

    const treeEntries = [];
    const allItems = [];

    stagedFiles.forEach(([path, fileData]) => {
      allItems.push({
        path,
        label: path.split('/').pop(),
        contentBase64: encodeUtf8Base64(fileData.content),
        mode: "100644",
        operation: 'create/update'
      });
    });

    stagedImages.forEach(([filename, imageData]) => {
      allItems.push({
        path: `overrides/assets/images/extract/media/${filename}`,
        label: filename,
        contentBase64: imageData.base64,
        mode: "100644",
        operation: 'create/update'
      });
    });
    
    stagedDeleted.forEach(path => {
      allItems.push({
        path,
        label: path.split('/').pop(),
        operation: 'delete'
      });
    });

    let processed = 0;
    for (const item of allItems) {
      processed++;
      if (item.operation === 'delete') {
        updateLoadingProgress(`Eliminazione file ${processed}/${allItems.length}: ${item.label}`);
        treeEntries.push({
          path: item.path,
          mode: "100644",
          type: "blob",
          sha: null  // null SHA indica eliminazione
        });
      } else {
        updateLoadingProgress(`Creazione blob ${processed}/${allItems.length}: ${item.label}`);
        const blob = await githubApiRequest("POST", `${apiBase}/git/blobs`, {
          content: item.contentBase64,
          encoding: "base64"
        });
        if (!blob?.sha) throw new Error(`Blob non creato per ${item.path}`);
        treeEntries.push({
          path: item.path,
          mode: item.mode,
          type: "blob",
          sha: blob.sha
        });
      }
    }

    updateLoadingProgress("Creazione tree...");
    const newTree = await githubApiRequest("POST", `${apiBase}/git/trees`, {
      base_tree: baseTreeSha,
      tree: treeEntries
    });
    if (!newTree?.sha) throw new Error("Creazione tree fallita");

    const commitMessage = buildBatchCommitMessage(fileCount, imageCount, deletedCount);
    updateLoadingProgress("Creazione commit...");
    const newCommit = await githubApiRequest("POST", `${apiBase}/git/commits`, {
      message: commitMessage,
      tree: newTree.sha,
      parents: [latestCommitSha]
    });
    if (!newCommit?.sha) throw new Error("Creazione commit fallita");

    updateLoadingProgress("Aggiornamento branch...");
    await githubApiRequest("PATCH", `${apiBase}/git/refs/heads/${branch}`, {
      sha: newCommit.sha
    });

    updateLoadingProgress("Allineamento cache locale...");
    await refreshCommittedFiles(stagedFiles, branch, apiBase);

    hideLoadingOverlay();
    
    // Mostra notifica di successo senza alert bloccante
    showToast(`Commit completato! ${totalCount} elementi caricati su GitHub`, '🚀', 5000);
    
    // Pulisci staging solo se tutto è andato bene
    clearStaging();

    // Aggiorna la cache delle immagini se necessario (senza ricaricare)
    if (imageCount > 0) {
      loadImagesList();
    }
    
    // Aggiorna stato repository senza ricaricare la pagina
    if (typeof checkRepoStatus === 'function') {
      setTimeout(() => checkRepoStatus(), 2000);
    }
    
  } catch (error) {
    console.error("❌ Errore durante il commit batch:", error);
    hideLoadingOverlay();
    
    // Mostra errore dettagliato senza alert bloccante
    const errorMsg = error.responseJSON?.message || error.statusText || error.message || 'Errore sconosciuto';
    showToast(`Errore commit: ${errorMsg}`, '❌', 8000);
    
    // NON pulire lo staging in caso di errore - mantieni le modifiche
    console.log("🔄 Modifiche mantenute nello staging a causa dell'errore");
  }
}function githubApiRequest(method, url, payload = null) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url,
      type: method,
      headers: { Authorization: `token ${window.currentToken}` },
      data: payload ? JSON.stringify(payload) : null,
      contentType: payload ? "application/json" : undefined,
      success: resolve,
      error: xhr => {
        console.error(`GitHub API ${method} ${url} ➜`, xhr.status, xhr.responseText);
        reject(xhr);
      }
    });
  });
}

function buildBatchCommitMessage(fileCount, imageCount, deletedCount = 0) {
  const parts = [];
  if (fileCount > 0) parts.push(`${fileCount} file`);
  if (imageCount > 0) parts.push(`${imageCount} immagini`);
  if (deletedCount > 0) parts.push(`${deletedCount} eliminazioni`);
  const summary = parts.length ? parts.join(" + ") : "nessuna modifica";
  return `Aggiornamento editor (${summary})`;
}

async function refreshCommittedFiles(stagedFiles, branch, apiBase) {
  if (!stagedFiles || stagedFiles.length === 0) return;

  const refreshPromises = stagedFiles.map(async ([path, fileData]) => {
    try {
      const file = await githubApiRequest("GET", `${apiBase}/contents/${path}?ref=${branch}`);
      if (!file?.sha) return;
      if (!window.allFilesCache) window.allFilesCache = {};
      window.allFilesCache[path] = {
        content: fileData?.content ?? null,
        sha: file.sha
      };
      if (currentFilePath === path) {
        currentSha = file.sha;
      }
    } catch (err) {
      console.warn("⚠️ Impossibile aggiornare cache locale per", path, err);
    }
  });

  await Promise.all(refreshPromises);
}

// === ESPORTAZIONI GLOBALI ===

// Espone updateStagingPanel globalmente
window.updateStagingPanel = updateStagingUI;

// 🔄 Espone funzioni auto-save globalmente
window.resetAutoSaveTimer = resetAutoSaveTimer;
window.cancelAutoSaveTimer = cancelAutoSaveTimer;
window.performAutoSave = performAutoSave;
window.lastSavedContent = lastSavedContent;

// Espone funzioni per gestione albero file globalmente (definite in files.js)
window.addFileToTree = window.addFileToTree || function(tree, filePath) {
  console.warn('addFileToTree non ancora definita, ricaricare files.js');
};

window.buildFileTree = window.buildFileTree || function() {
  console.warn('buildFileTree non ancora definita, ricaricare files.js');
};

window.setupFolderToggle = window.setupFolderToggle || function() {
  console.warn('setupFolderToggle non ancora definita, ricaricare files.js');
};