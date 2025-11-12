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
  }, 100); // Ridotto timeout per essere più veloce
}

// Inizializzazione editor
function initEditor() {
  editor = editormd("editor", {
    width: "100%",
    height: 640,
    path: "https://cdn.jsdelivr.net/npm/editor.md@1.5.0/lib/",
    toolbar: true,
    imageUpload: false,
    htmlDecode: true,
    setMarkdown: "# Benvenuto nel tuo editor Markdown",
    onload: updatePreviewImages,
    onchange: updatePreviewImages
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
  }
  updateStagingUI();
}

// Conta elementi nello staging
function getStagingCount() {
  return window.localStaging.files.size + window.localStaging.images.size;
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
  
  $list.html(html);
}

// Commit batch di tutti gli elementi nello staging
function commitAllStaging() {
  const fileCount = window.localStaging.files.size;
  const imageCount = window.localStaging.images.size;
  const totalCount = fileCount + imageCount;
  
  if (totalCount === 0) {
    alert("Nessuna modifica nello staging da committare.");
    return;
  }
  
  const confirmMsg = `🚀 Commit di ${totalCount} elementi:\n• ${fileCount} file\n• ${imageCount} immagini\n\nProcedere?`;
  if (!confirm(confirmMsg)) return;
  
  console.log("🚀 Avvio commit batch staging...");
  showLoadingOverlay("🚀 Commit in corso...", "Inizializzazione...");
  
  let completed = 0;
  let errors = 0;
  
  // Funzione per aggiornare progress
  function updateProgress() {
    completed++;
    const progressText = `Completato ${completed}/${totalCount} (${errors} errori)`;
    updateLoadingProgress(progressText);
    
    if (completed >= totalCount) {
      hideLoadingOverlay();
      
      if (errors === 0) {
        alert(`✅ Commit completato con successo!\n${totalCount} elementi caricati su GitHub.`);
        clearStaging();
        
        // Ricarica cache immagini se necessario
        if (imageCount > 0) {
          loadImagesList();
        }
      } else {
        alert(`⚠️ Commit completato con ${errors} errori su ${totalCount} elementi.`);
      }
    }
  }
  
  // Commit files
  let fileIndex = 0;
  window.localStaging.files.forEach((fileData, path) => {
    setTimeout(() => {
      updateLoadingProgress(`Caricamento file: ${path.split('/').pop()}`);
      commitSingleFile(path, fileData, updateProgress, () => {
        errors++;
        updateProgress();
      });
    }, fileIndex * 100); // Delay per evitare rate limiting
    fileIndex++;
  });
  
  // Commit images
  let imageIndex = 0;
  window.localStaging.images.forEach((imageData, filename) => {
    setTimeout(() => {
      updateLoadingProgress(`Caricamento immagine: ${filename}`);
      commitSingleImage(filename, imageData, updateProgress, () => {
        errors++;
        updateProgress();
      });
    }, (fileIndex + imageIndex) * 100);
    imageIndex++;
  });
}

// Helper: commit singolo file
function commitSingleFile(path, fileData, onSuccess, onError) {
  // Se ha SHA, deve prima ottenere quello corrente per evitare conflitti
  if (fileData.originalSha) {
    $.ajax({
      url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/${path}?ref=main`,
      headers: { Authorization: `token ${window.currentToken}` },
      success: file => {
        // Usa SHA corrente
        uploadFileToGitHub(path, fileData.content, file.sha, onSuccess, onError);
      },
      error: () => {
        // File eliminato nel frattempo, carica come nuovo
        uploadFileToGitHub(path, fileData.content, null, onSuccess, onError);
      }
    });
  } else {
    // Nuovo file
    uploadFileToGitHub(path, fileData.content, null, onSuccess, onError);
  }
}

// Helper: upload file su GitHub
function uploadFileToGitHub(path, content, sha, onSuccess, onError) {
  const data = {
    message: `Aggiornamento da editor web: ${path.split('/').pop()}`,
    content: btoa(unescape(encodeURIComponent(content)))
  };
  
  if (sha) data.sha = sha;
  
  $.ajax({
    url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/${path}`,
    type: "PUT",
    headers: { Authorization: `token ${window.currentToken}` },
    data: JSON.stringify(data),
    success: onSuccess,
    error: (xhr) => {
      console.error("Errore upload file:", path, xhr.status);
      onError();
    }
  });
}

// Helper: commit singola immagine
function commitSingleImage(filename, imageData, onSuccess, onError) {
  $.ajax({
    url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/overrides/assets/images/extract/media/${filename}`,
    type: "PUT",
    headers: { Authorization: `token ${window.currentToken}` },
    data: JSON.stringify({ 
      message: `Aggiunta immagine da editor web: ${filename}`, 
      content: imageData.base64 
    }),
    success: onSuccess,
    error: (xhr) => {
      console.error("Errore upload immagine:", filename, xhr.status);
      onError();
    }
  });
}

// === ESPORTAZIONI GLOBALI ===

// Espone updateStagingPanel globalmente
window.updateStagingPanel = updateStagingUI;

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