/* ================== FILE MANAGEMENT ================== */

// Caricamento file dalla repo con struttura ad albero
function loadFiles(username, repo, token) {
  console.log("loadFiles chiamata con:", { username, repo, token: token ? "***" : "undefined" });
  
  if (!username || !repo || !token) {
    console.error("Parametri mancanti in loadFiles:", { username, repo, token: !!token });
    alert("Errore: parametri di configurazione mancanti per loadFiles");
    return;
  }
  
  $("#file-list-ul").empty();
  lastLoadedFiles = [];
  window.allFilesCache = {}; // Reset cache

  // Struttura per organizzare i file per cartella - GLOBALE per riuso
  window.fileTree = {};
  const fileTree = window.fileTree;

  function fetchFolder(path = "") {
    $.ajax({
      url: `https://api.github.com/repos/${username}/${repo}/contents/${path}`,
      headers: { Authorization: `token ${token}` },
      success: files => {
        files.forEach(file => {
          if (file.type === "dir") {
            const isDocsDir = file.path === "docs" || file.path.startsWith("docs/");
            const isPreConfigDir = file.path === "preConfiguration" || file.path.startsWith("preConfiguration/");
            if (isDocsDir || isPreConfigDir) {
              fetchFolder(file.path);
            }
            return;
          }

          if (file.type !== "file") {
            return;
          }

          const isDocsFile = file.path.startsWith("docs/") && file.name.endsWith(".md") && !file.path.startsWith("docs/site/");
          const isPreConfigFile = file.path.startsWith("preConfiguration/");

          if (!isDocsFile && !isPreConfigFile) {
            return;
          }

          if (!lastLoadedFiles.includes(file.path)) {
            lastLoadedFiles.push(file.path);
          }

          downloadFileContent(file.path, username, repo, token, "main");
          addFileToTree(fileTree, file.path);
          console.log("📄 Aggiunto file:", file.path, "alla struttura");
        });
        
        // Dopo aver caricato tutti i file, costruisci l'albero
        setTimeout(() => {
          if (Object.keys(fileTree).length > 0) {
            console.log("🌳 FileTree structure:", fileTree);
            buildFileTree();
          }
        }, 500); // Aspetta che tutti i file siano processati
      },
      error: err => console.error("Errore caricamento file:", err)
    });
  }



  fetchFolder();
}

// === FUNZIONI GLOBALI PER GESTIONE ALBERO FILE ===

// Aggiunge un file alla struttura ad albero
function addFileToTree(tree, filePath) {
  let parts = filePath.split('/');

  // Visualizza preConfiguration come sottocartella di docs mantenendo i percorsi reali
  if (filePath.startsWith('preConfiguration/')) {
    parts = ['docs', 'preConfiguration', ...parts.slice(1)];
  }
  let current = tree;
  
  // Naviga attraverso le cartelle (escludi l'ultimo elemento che è il file)
  for (let i = 0; i < parts.length - 1; i++) {
    const folder = parts[i];
    if (!current[folder]) {
      current[folder] = { isFolder: true, children: {}, files: [] };
    }
    current = current[folder];
  }
  
  // Aggiunge il file alla cartella finale
  const fileName = parts[parts.length - 1];
  current.files.push({ name: fileName, path: filePath });
}

// Costruisce l'HTML dell'albero file
function buildFileTree() {
  if (!window.fileTree) {
    console.warn('⚠️ fileTree non disponibile');
    return;
  }
  
  let html = '';
  
  function renderFolder(folderData, folderName, level = 0, parentPath = '') {
    const indent = '  '.repeat(level);
    const currentPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    const folderId = `folder-${currentPath.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const isPreConfigFolder = currentPath === 'docs/preConfiguration';
    const isOpen = !isPreConfigFolder;
    const displayStyle = isOpen ? 'block' : 'none';
    const toggleSymbol = isOpen ? '▼' : '▶';
    const iconSymbol = isOpen ? '📂' : '📁';
    
    html += `
      <li class="folder-item">
        <div class="folder-header" data-folder="${folderId}">
          <span class="folder-icon">${iconSymbol}</span>
          <span class="folder-name">${folderName}</span>
          <span class="folder-toggle">${toggleSymbol}</span>
        </div>
        <ul class="folder-content" id="${folderId}" style="display: ${displayStyle};">
    `;
    
      // Renderizza i file nella cartella
      folderData.files.forEach(file => {
        html += `
          <li class="file-item">
            <a href="#" class="open-repo-file" data-path="${file.path}">
              <span class="file-icon">📄</span>
              <span class="file-name">${file.name}</span>
            </a>
          </li>
        `;
      });    // Renderizza le sottocartelle
    Object.keys(folderData).forEach(key => {
      if (key !== 'isFolder' && key !== 'files' && folderData[key].isFolder) {
        renderFolder(folderData[key], key, level + 1, currentPath);
      }
    });
    
    html += `
        </ul>
      </li>
    `;
  }
  
  // Inizia il rendering dall'albero principale
  Object.keys(window.fileTree).forEach(folderName => {
    if (window.fileTree[folderName] && window.fileTree[folderName].isFolder) {
      renderFolder(window.fileTree[folderName], folderName, 0, '');
    }
  });
  
  $("#file-list-ul").html(html);
  
  // Aggiungi gli event listeners per l'espansione/compressione cartelle
  setupFolderToggle();
}

// Setup degli event listeners per le cartelle
function setupFolderToggle() {
  $(".folder-header").off("click").on("click", function() {
    const folderId = $(this).data("folder");
    const folderContent = $(`#${folderId}`);
    const toggle = $(this).find(".folder-toggle");
    const icon = $(this).find(".folder-icon");
    
    if (folderContent.is(":visible")) {
      folderContent.slideUp(200);
      toggle.text("▶");
      icon.text("📁");
    } else {
      folderContent.slideDown(200);
      toggle.text("▼");
      icon.text("📂");
    }
  });
}

// Scarica il contenuto di un singolo file e lo mette in cache
function downloadFileContent(path, username, repo, token, branchName = "main") {
  console.log("downloadFileContent chiamata con:", { path, username, repo, branchName, token: token ? "***" : "undefined" });
  
  if (!username || !repo || !token) {
    console.error("Parametri mancanti in downloadFileContent:", { username, repo, branchName, token: !!token });
    return;
  }
  
  $.ajax({
    url: `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=${branchName}`,
    headers: { Authorization: `token ${token}` },
    success: file => {
      if (file?.content) {
        const content = decodeBase64Utf8(file.content);
        window.allFilesCache[path] = { content, sha: file.sha };
      }
    },
    error: err => console.error("Errore download file:", path, err)
  });
}

// Carica un singolo file nell'editor
function loadFile(path, username, repo, token) {
  console.log("loadFile chiamata con:", { path, username, repo, token: token ? "***" : "undefined" });
  
  if (!username || !repo || !token) {
    console.error("Parametri mancanti in loadFile:", { username, repo, token: !!token });
    alert("Errore: parametri di configurazione mancanti");
    return;
  }
  // Prima controlla se ci sono modifiche non salvate nel file corrente
  if (currentFilePath && editor && editor.getMarkdown() !== currentFileContent) {
    saveCurrentFileToMemory();
  }

  // Carica il file: prima da pendingChanges, poi da cache, infine da GitHub
  const pending = window.pendingChanges.find(f => f.path === path);
  if (pending) {
    // File modificato in memoria
    currentFileContent = pending.content;
    // ✅ Editor mantiene contenuto originale (non modifico i path nel markdown)
    editor.setMarkdown(pending.content);
    currentFilePath = path; currentSha = pending.sha;
    highlightActiveFile(path);
    updatePreviewImages();
    console.log("Caricato da pendingChanges:", path);
  } else if (window.allFilesCache[path]) {
    // File in cache (scaricato all'inizio)
    currentFileContent = window.allFilesCache[path].content;
    // ✅ Editor mantiene contenuto originale
    editor.setMarkdown(window.allFilesCache[path].content);
    currentFilePath = path; currentSha = window.allFilesCache[path].sha;
    highlightActiveFile(path);
    updatePreviewImages();
    console.log("Caricato da cache:", path);
  } else {
    // Fallback: scarica da GitHub
    $.ajax({
      url: `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=main`,
      headers: { Authorization: `token ${token}` },
      success: file => {
        if (!file?.content) return;
        const content = decodeBase64Utf8(file.content);
        currentFileContent = content;
        // ✅ Editor mantiene contenuto originale
        editor.setMarkdown(content);
        currentFilePath = path; currentSha = file.sha;
        highlightActiveFile(path);
        updatePreviewImages();
        // Salva in cache per prossimi usi
        window.allFilesCache[path] = { content, sha: file.sha };
        console.log("Caricato da GitHub:", path);
      },
      error: err => alert("Errore nel caricamento del file.")
    });
    return; // Exit early per evitare di eseguire il resto
  }

  // Aggiorna le immagini nella preview usando la funzione centralizzata
  updatePreviewImages();
}

// Funzione per popolare le opzioni di path disponibili
function loadPathOptions() {
  const pathOptions = document.getElementById('pathOptions');
  if (!pathOptions) return;
  
  // Ottieni le directory esistenti dai file caricati
  const directories = new Set();
  
  // Aggiungi directory base conosciute
  directories.add('docs/');
  directories.add('docs/it/');
  directories.add('docs/en/');
  directories.add('overrides/');
  directories.add('preConfiguration/');
  
  // Scansiona tutti i file per trovare directory esistenti
  if (lastLoadedFiles && lastLoadedFiles.length > 0) {
    lastLoadedFiles.forEach(filePath => {
      const file = { path: filePath }; // Simula struttura file
      const pathParts = file.path.split('/');
      if (pathParts.length > 1) {
        // Costruisci i path delle directory
        let currentPath = '';
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentPath += pathParts[i] + '/';
          // Aggiungi tutte le directory trovate
          directories.add(currentPath);
        }
      }
    });
  }
  
  console.log('📁 Directory trovate:', Array.from(directories).sort());
  
  // Crea le opzioni radio per ogni directory
  pathOptions.innerHTML = '';
  const sortedDirs = Array.from(directories).sort();
  
  sortedDirs.forEach((dir, index) => {
    const radioDiv = document.createElement('div');
    radioDiv.style.marginBottom = '8px';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'filePath';
    radio.value = dir;
    radio.id = `path_${index}`;
    if (index === 0) radio.checked = true; // Seleziona il primo per default
    
    const label = document.createElement('label');
    label.htmlFor = `path_${index}`;
    label.style.marginLeft = '8px';
    label.style.cursor = 'pointer';
    
    // Icone diverse per tipo di directory
    let icon = '📁';
    if (dir.includes('/it/')) icon = '🇮🇹';
    else if (dir.includes('/en/')) icon = '🇬🇧';
    else if (dir.includes('admin/')) icon = '⚙️';
    else if (dir.includes('overrides/')) icon = '🎨';
    else if (dir.includes('preConfiguration/')) icon = '🔧';
    else if (dir === 'docs/') icon = '📚';
    
    label.innerHTML = `${icon} <span style="font-family: monospace;">${dir}</span>`;
    
    // Aggiorna il path completo quando selezionato
    radio.addEventListener('change', updateFullPath);
    
    radioDiv.appendChild(radio);
    radioDiv.appendChild(label);
    pathOptions.appendChild(radioDiv);
  });
  
  // Aggiorna il path completo iniziale
  updateFullPath();
}

// Funzione per aggiornare il path completo
function updateFullPath() {
  const selectedPath = document.querySelector('input[name="filePath"]:checked');
  const fileName = document.getElementById('newFileName').value;
  const fullPathInput = document.getElementById('fullFilePath');
  
  if (selectedPath && fullPathInput) {
    const basePath = selectedPath.value;
    const fullPath = fileName ? `${basePath}${fileName}` : basePath;
    fullPathInput.value = fullPath;
  }
}

// Crea un nuovo file
function createNewFile() {
  // Carica le opzioni di path e mostra la modal
  loadPathOptions();
  document.getElementById('newFileModal').style.display = 'flex';
  
  // Reset dei campi
  document.getElementById('newFileName').value = '';
  updateFullPath();
}

// Funzione per confermare la creazione del file
function confirmCreateFile() {
  const fileName = document.getElementById('newFileName').value.trim();
  const selectedPath = document.querySelector('input[name="filePath"]:checked');
  
  if (!fileName) {
    alert('⚠️ Inserisci un nome per il file');
    return;
  }
  
  if (!selectedPath) {
    alert('⚠️ Seleziona una directory');
    return;
  }
  
  // Aggiungi l'estensione .md se non presente
  const finalFileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
  const fullPath = `${selectedPath.value}${finalFileName}`;
  
  // Crea un contenuto vuoto per il nuovo file
  const newContent = `# ${finalFileName.replace('.md', '').replace(/[_-]/g, ' ')}\n\nContenuto del documento...\n`;
  
  // Usa il sistema di staging invece di pendingChanges
  if (window.stageFileLocally) {
    window.stageFileLocally(fullPath, newContent, null, true); // null SHA = nuovo file, true = isNew
    console.log('✅ Nuovo file aggiunto al staging:', fullPath);
    
    // Aggiungi anche alla cache per compatibilità
    if (!window.allFilesCache) window.allFilesCache = {};
    window.allFilesCache[fullPath] = { content: newContent, sha: null };
    
    // ✅ AGGIUNGI ANCHE ALLA LISTA REPOSITORY per farlo apparire nell'albero
    if (!window.lastLoadedFiles) window.lastLoadedFiles = [];
    if (!lastLoadedFiles.includes(fullPath)) {
      lastLoadedFiles.push(fullPath);
      console.log('📄 File aggiunto alla lista repository:', fullPath);
    }
    
    // Aggiorna l'interfaccia
    if (window.updateStagingPanel) window.updateStagingPanel();
    
    // Carica il nuovo file nell'editor
    window.currentFile = finalFileName;
    currentFileContent = newContent;
    currentFilePath = fullPath;
    currentSha = null;
    
    // Imposta il contenuto nell'editor se disponibile
    if (typeof editor !== 'undefined' && editor && typeof editor.setMarkdown === 'function') {
      editor.setMarkdown(newContent);
    } else {
      console.warn('⚠️ Editor non ancora inizializzato, contenuto salvato in memoria');
    }
    
    // ✅ RICOSTRUISCI L'ALBERO FILE invece di ricaricare tutto da GitHub
    buildFileTreeWithNewFile(fullPath);
    
    // Evidenzia il nuovo file
    setTimeout(() => {
      highlightActiveFile(fullPath);
    }, 100);
    
  } else {
    console.error('❌ Sistema di staging non disponibile');
    alert('❌ Errore: sistema di staging non disponibile');
    return;
  }
  
  // Chiudi la modal
  document.getElementById('newFileModal').style.display = 'none';
  
  alert('✅ Nuovo file creato e aggiunto al staging! Ricordati di fare Commit All per salvarlo su GitHub.');
}

// Salva il file corrente in memoria (pendingChanges + cache)
function saveCurrentFileToMemory() {
  if (!currentFilePath || !editor) return;
  let content = editor.getMarkdown();
  content = content.replace(/!\[(.*?)\]\(https:\/\/raw\.githubusercontent\.com\/[^\/]+\/[^\/]+\/[^\/]+\/overrides\/assets\/images\/([^)]+)\)/g, "![$1](images/$2)");
  // Usa il nuovo sistema di staging locale invece di pendingChanges
  stageFileLocally(currentFilePath, content, currentSha);
  currentFileContent = content;
  if (window.allFilesCache[currentFilePath]) {
    window.allFilesCache[currentFilePath].content = content;
  } else {
    window.allFilesCache[currentFilePath] = { content, sha: currentSha };
  }
  console.log("[MEM] salvato:", currentFilePath);
}

// Salva file manualmente
function saveFile() {
  // Only update pendingChanges - keep manual save functionality
  saveCurrentFileToMemory();
  alert("Modifica salvata localmente. Verrà inviata con Push All.");
}

// Push di tutti i file modificati
function pushAllChanges() {
  if (!window.currentUsername || !window.currentRepo || !window.currentToken) return alert("Credenziali mancanti.");
  if (window.pendingChanges.length === 0) return alert("Nessuna modifica da inviare.");

  alert(`Avvio push di ${window.pendingChanges.length} file...`);
  let completed = 0, errors = 0;

  // Helper per assicurare lo SHA (solo se file esiste già)
  function ensureSha(change, done) {
    if (change.sha) return done(change.sha);
    $.ajax({
      url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/${change.path}?ref=main`,
      headers: { Authorization: `token ${window.currentToken}` },
      success: file => {
        done(file.sha);
      },
      error: () => {
        // Se 404, è un nuovo file: sha rimane null
        done(null);
      }
    });
  }

  function pushNext(index) {
    if (index >= window.pendingChanges.length) {
      alert(`Push terminato. OK: ${completed}, Errori: ${errors}`);
      if (errors === 0) window.pendingChanges = [];
      
      // Aggiorna stato repository dopo il push
      setTimeout(() => checkRepoStatus(), 1000);
      return;
    }
    const change = window.pendingChanges[index];
    ensureSha(change, sha => {
      const body = {
        message: `Update ${change.path} (batch wising)`,
        content: encodeUtf8Base64(change.content)
      };
      if (sha) body.sha = sha;
      $.ajax({
        url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/${change.path}`,
        type: "PUT",
        headers: { Authorization: `token ${window.currentToken}` },
        data: JSON.stringify(body),
        success: res => {
          completed++;
          window.allFilesCache[change.path] = { content: change.content, sha: res.content.sha };
          console.log(`[PUSH OK] ${change.path}`);
          pushNext(index + 1);
        },
        error: (xhr) => {
          errors++;
          console.error(`[PUSH ERR] ${change.path} status=${xhr.status} resp=`, xhr.responseText);
          // Retry once if conflict (409) or SHA mismatch (422)
          if (xhr.status === 409 || xhr.status === 422) {
            console.log(`[RETRY] ${change.path}`);
            ensureSha(change, newSha => {
              const retryBody = {
                message: `Retry update ${change.path}`,
                content: encodeUtf8Base64(change.content)
              };
              if (newSha) retryBody.sha = newSha;
              $.ajax({
                url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/${change.path}`,
                type: "PUT",
                headers: { Authorization: `token ${window.currentToken}` },
                data: JSON.stringify(retryBody),
                success: res2 => {
                  completed++;
                  console.log(`[RETRY OK] ${change.path}`);
                  window.allFilesCache[change.path] = { content: change.content, sha: res2.content.sha };
                  pushNext(index + 1);
                },
                error: (xhr2) => {
                  errors++;
                  console.error(`[RETRY FAIL] ${change.path} status=${xhr2.status} resp=`, xhr2.responseText);
                  pushNext(index + 1);
                }
              });
            });
          } else {
            pushNext(index + 1);
          }
        }
      });
    });
  }

  pushNext(0);
}

// Evidenzia il file attualmente caricato nell'albero
function highlightActiveFile(filePath) {
  // Rimuovi evidenziazione precedente
  $(".file-item a").removeClass("active");
  
  // Evidenzia il file corrente
  $(`.file-item a[data-path="${filePath}"]`).addClass("active");
}

// Funzione per ricostruire l'albero con un nuovo file senza ricaricare da GitHub
function buildFileTreeWithNewFile(newFilePath) {
  console.log('🌳 Ricostruzione albero con nuovo file:', newFilePath);
  
  // Aggiungi il nuovo file alla struttura ad albero esistente
  if (typeof window.fileTree === 'undefined') {
    window.fileTree = {};
  }
  
  addFileToTree(window.fileTree, newFilePath);
  
  // Ricostruisci l'albero
  buildFileTree();
}

// === ESPORTAZIONI GLOBALI ===

// Esporta le funzioni per la modal nuovo file
window.updateFullPath = updateFullPath;
window.confirmCreateFile = confirmCreateFile;

// === ESPORTAZIONI GLOBALI FUNZIONI ALBERO FILE ===
window.addFileToTree = addFileToTree;
window.buildFileTree = buildFileTree;
window.setupFolderToggle = setupFolderToggle;