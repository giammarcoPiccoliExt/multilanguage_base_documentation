/* ================== IMAGE MANAGEMENT ================== */

// Image management system functions - con cache immediata
function loadImagesList(callback) {
  console.log("🖼️ Caricamento lista immagini e cache...");
  
  // Mostra loading overlay
  showLoadingOverlay("📦 Caricamento immagini...", "Connessione al repository...");
  
  $.ajax({
    url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/overrides/assets/images/extract/media`,
    headers: { Authorization: `token ${window.currentToken}` },
    success: files => {
      const imageFiles = files.filter(f => f.type === "file" && /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(f.name));
      
      window.cachedImages = imageFiles.map(f => ({
        name: f.name, 
        local: "images/extract/media/" + f.name, 
        download_url: f.download_url, 
        dataUrl: null,
        sha: f.sha,
        size: f.size
      }));
      
      console.log(`📦 Trovate ${window.cachedImages.length} immagini da scaricare...`);
      updateLoadingProgress(`Trovate ${window.cachedImages.length} immagini`);
      
      if (window.cachedImages.length === 0) {
        console.log("📭 Nessuna immagine trovata");
        hideLoadingOverlay();
        buildImageList(); // Mostra lista vuota
        if (callback) callback(window.cachedImages);
        return;
      }
      
      let pending = window.cachedImages.length;
      let downloaded = 0;
      
      updateLoadingProgress(`Scaricamento 0/${window.cachedImages.length} immagini...`);
      
      // Scarica tutte le immagini in parallelo per performance
      window.cachedImages.forEach((img, idx) => {
        $.ajax({
          url: img.download_url, 
          xhrFields: { responseType: "blob" },
          success: blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              window.cachedImages[idx].dataUrl = reader.result;
              downloaded++;
              updateLoadingProgress(`Scaricate ${downloaded}/${window.cachedImages.length} immagini`);
              console.log(`✅ Immagine ${downloaded}/${window.cachedImages.length} scaricata: ${img.name}`);
              
              if (--pending === 0) {
                console.log("🎉 Tutte le immagini caricate in cache!");
                hideLoadingOverlay();
                buildImageList(); // Costruisci lista nel sidebar
                if (callback) callback(window.cachedImages);
              }
            };
            reader.readAsDataURL(blob);
          },
          error: (xhr) => {
            console.error(`❌ Errore scaricamento ${img.name}:`, xhr.status);
            if (--pending === 0) {
              console.log(`⚠️ Cache immagini completata con ${downloaded} successi su ${window.cachedImages.length}`);
              hideLoadingOverlay();
              buildImageList(); // Costruisci lista nel sidebar
              if (callback) callback(window.cachedImages);
            }
          }
        });
      });
    },
    error: (xhr) => { 
      console.error("❌ Errore caricamento lista immagini:", xhr.status);
      hideLoadingOverlay();
      window.cachedImages = []; 
      buildImageList(); // Mostra lista vuota in caso di errore
      if (callback) callback([]);
    }
  });
}

// Costruisce la lista immagini nel sidebar
function buildImageList() {
  console.log("🖼️ Costruzione lista immagini nel sidebar...");
  
  if (!window.cachedImages || window.cachedImages.length === 0) {
    $("#image-list-ul").html('<li style="text-align: center; color: #999; padding: 10px; font-size: 11px;">Nessuna immagine disponibile</li>');
    return;
  }
  
  let html = '';
  
  window.cachedImages.forEach((img, idx) => {
    const loadStatus = img.dataUrl ? '🖼️' : '⏳';
    const sizeInfo = img.size ? ` (${(img.size / 1024).toFixed(1)}KB)` : '';
    
    html += `
      <li class="image-item">
        <div class="image-item-content">
          <span class="image-icon">${loadStatus}</span>
          <span class="image-name" title="${img.name}${sizeInfo}">${img.name}</span>
          <div class="image-actions">
            <button class="image-btn zoom" onclick="enlargeImage('${img.name}')" title="Ingrandisci">🔍</button>
            <button class="image-btn copy" onclick="copyImageMarkdown('${img.name}')" title="Copia percorso Markdown">📋</button>
          </div>
        </div>
      </li>
    `;
  });
  
  $("#image-list-ul").html(html);
  console.log(`✅ Lista immagini costruita: ${window.cachedImages.length} elementi`);
}



function uploadImage(file) {
  console.log("� Staging immagine locale:", file.name);
  
  // Controlla se già presente nello staging
  if (window.localStaging.images.has(file.name)) {
    alert(`⚠️ L'immagine "${file.name}" è già in staging!`);
    return;
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    const base64 = e.target.result.split(",")[1];
    
    // Aggiungi allo staging locale invece di caricare subito
    stageImageLocally(file.name, file, base64);
    
    // Aggiorna la lista immagini per mostrare l'immagine in staging (opzionale)
    // buildImageList();
    
    alert(`📦 Immagine "${file.name}" aggiunta allo staging locale!\nUsa "Commit All" per caricare tutto su GitHub.`);
    console.log("✅ Immagine staged:", file.name);
  };
  
  reader.onerror = () => {
    alert("❌ Errore nella lettura del file.");
  };
  
  reader.readAsDataURL(file);
}

// Ingrandisce un'immagine in una modal
function enlargeImage(imageName) {
  console.log("🔍 Ingrandimento immagine:", imageName);
  
  const img = window.cachedImages?.find(i => i.name === imageName);
  if (!img) {
    console.error("❌ Immagine non trovata:", imageName);
    alert("Errore: immagine non trovata");
    return;
  }
  
  const imgSrc = img.dataUrl || img.download_url;
  showImageModal(imgSrc, img.name);
}

// Copia il percorso Markdown dell'immagine negli appunti
function copyImageMarkdown(imageName) {
  const markdownPath = `![DIDASCALIA](assets/images/extract/media/${imageName})`;
  
  // Usa l'API moderna degli appunti se disponibile
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(markdownPath).then(() => {
      console.log("📋 Percorso Markdown copiato:", markdownPath);
      
      // Feedback visivo temporaneo
      const btn = event.target;
      const originalText = btn.innerHTML;
      btn.innerHTML = '✅';
      btn.style.background = '#28a745';
      btn.style.color = 'white';
      
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = '';
        btn.style.color = '';
      }, 1000);
      
    }).catch(err => {
      console.error("❌ Errore copia negli appunti:", err);
      fallbackCopyTextToClipboard(markdownPath);
    });
  } else {
    // Fallback per browser che non supportano clipboard API
    fallbackCopyTextToClipboard(markdownPath);
  }
}

// Funzione fallback per copiare negli appunti
function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    const msg = successful ? 'riuscita' : 'fallita';
    console.log(`📋 Copia negli appunti ${msg}:`, text);
    
    if (successful) {
      // Feedback visivo
      alert(`✅ Percorso Markdown copiato!\n${text}`);
    } else {
      alert(`❌ Impossibile copiare automaticamente.\nCopia manualmente:\n${text}`);
    }
  } catch (err) {
    console.error('❌ Errore comando copia:', err);
    alert(`❌ Impossibile copiare automaticamente.\nCopia manualmente:\n${text}`);
  }
  
  document.body.removeChild(textArea);
}

// === ESPORTAZIONI GLOBALI ===
window.enlargeImage = enlargeImage;
window.copyImageMarkdown = copyImageMarkdown;
window.buildImageList = buildImageList;