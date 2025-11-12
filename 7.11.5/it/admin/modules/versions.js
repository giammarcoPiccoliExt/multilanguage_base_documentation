/* ================== VERSION EDITOR FUNCTIONS ================== */

function loadGhPagesVersions() {
  const { username, repo, token } = getCurrentCredentials();
  if (!username || !repo || !token) {
    return Promise.reject("Credenziali mancanti");
  }

  return new Promise((resolve, reject) => {
    $.ajax({
      url: `https://api.github.com/repos/${username}/${repo}/contents/?ref=gh-pages`,
      headers: { Authorization: `token ${token}` },
      success: function(contents) {
        // Filtra solo le directory, escludendo file come .nojekyll, README.md, ecc.
        const directories = contents.filter(item => 
          item.type === "dir" && 
          !item.name.startsWith('.') && 
          item.name !== "README.md"
        );
        
        window.ghPagesVersions = directories.map(dir => ({
          name: dir.name,
          path: dir.path,
          isProtected: dir.name === "latest",
          sha: dir.sha
        }));
        
        resolve(window.ghPagesVersions);
      },
      error: function(xhr) {
        const errorMsg = xhr.status === 404 ? 
          "Branch gh-pages non trovato" : 
          `Errore ${xhr.status}: ${xhr.responseJSON?.message || 'Errore sconosciuto'}`;
        reject(errorMsg);
      }
    });
  });
}

function showVersionEditor() {
  // Mostra la modale
  $("#versionEditorModal").css("display", "block");
  
  // Reset UI
  $("#versionLoadingIndicator").show();
  $("#versionsList").hide();
  $("#versionsError").hide();
  
  // Carica le versioni
  loadGhPagesVersions()
    .then(versions => {
      $("#versionLoadingIndicator").hide();
      
      if (versions.length === 0) {
        $("#versionsError").html("📭 Nessuna versione trovata nel branch gh-pages").show();
        return;
      }
      
      // Genera la lista delle versioni
      let html = "";
      versions.forEach(version => {
        const isProtected = version.isProtected;
        const checkboxDisabled = isProtected ? "disabled" : "";
        const itemClass = isProtected ? "version-item protected" : "version-item";
        
        html += `
          <div class="${itemClass}">
            <input type="checkbox" 
                   class="version-checkbox" 
                   value="${version.name}" 
                   ${checkboxDisabled}
                   data-path="${version.path}">
            <span class="version-name">${version.name}</span>
            ${isProtected ? '<span class="version-protected">PROTETTA</span>' : ''}
            <span class="version-info">📁 Directory</span>
          </div>
        `;
      });
      
      $("#versionsCheckboxList").html(html);
      $("#versionsList").show();
    })
    .catch(error => {
      $("#versionLoadingIndicator").hide();
      $("#versionsError").html(`❌ ${error}`).show();
    });
}

function deleteGhPagesDirectory(dirPath) {
  const { username, repo, token } = getCurrentCredentials();
  
  return new Promise((resolve, reject) => {
    // Prima otteniamo tutti i file nella directory dal branch gh-pages
    $.ajax({
      url: `https://api.github.com/repos/${username}/${repo}/contents/${dirPath}?ref=gh-pages`,
      headers: { Authorization: `token ${token}` },
      success: function(contents) {
        console.log(`📁 Elaborazione directory: ${dirPath} (${contents.length} elementi)`);
        
        if (contents.length === 0) {
          resolve();
          return;
        }
        
        let errors = [];
        
        // Funzione per eliminare gli elementi uno per uno (sequenziale)
        function deleteItemSequentially(items, index = 0) {
          if (index >= items.length) {
            if (errors.length > 0) {
              reject(`Alcuni file non sono stati eliminati: ${errors.join(', ')}`);
            } else {
              resolve();
            }
            return;
          }
          
          const item = items[index];
          console.log(`🗑️ Eliminazione [${index + 1}/${items.length}]: ${item.path}`);
          
          if (item.type === "file") {
            // Elimina il file
            $.ajax({
              url: `https://api.github.com/repos/${username}/${repo}/contents/${item.path}`,
              method: "DELETE",
              headers: { Authorization: `token ${token}` },
              data: JSON.stringify({
                message: `Delete ${item.path} (Version Editor)`,
                sha: item.sha,
                branch: "gh-pages"
              }),
              success: function() {
                console.log(`✅ Eliminato file: ${item.path}`);
                // Piccola pausa per evitare rate limiting
                setTimeout(() => deleteItemSequentially(items, index + 1), 100);
              },
              error: function(xhr) {
                console.error(`❌ Errore eliminazione ${item.path}: ${xhr.status}`);
                if (xhr.status === 409) {
                  // Conflitto: proviamo a recuperare l'SHA aggiornato
                  console.log(`🔄 Retry con SHA aggiornato: ${item.path}`);
                  $.ajax({
                    url: `https://api.github.com/repos/${username}/${repo}/contents/${item.path}?ref=gh-pages`,
                    headers: { Authorization: `token ${token}` },
                    success: function(updatedFile) {
                      $.ajax({
                        url: `https://api.github.com/repos/${username}/${repo}/contents/${item.path}`,
                        method: "DELETE",
                        headers: { Authorization: `token ${token}` },
                        data: JSON.stringify({
                          message: `Delete ${item.path} (Version Editor - Retry)`,
                          sha: updatedFile.sha,
                          branch: "gh-pages"
                        }),
                        success: function() {
                          console.log(`✅ Eliminato file (retry): ${item.path}`);
                          setTimeout(() => deleteItemSequentially(items, index + 1), 200);
                        },
                        error: function(xhr2) {
                          errors.push(`${item.path}: ${xhr2.status}`);
                          setTimeout(() => deleteItemSequentially(items, index + 1), 200);
                        }
                      });
                    },
                    error: function() {
                      errors.push(`${item.path}: ${xhr.status}`);
                      setTimeout(() => deleteItemSequentially(items, index + 1), 200);
                    }
                  });
                } else {
                  errors.push(`${item.path}: ${xhr.status}`);
                  setTimeout(() => deleteItemSequentially(items, index + 1), 200);
                }
              }
            });
          } else if (item.type === "dir") {
            // Per le directory, chiamata ricorsiva
            deleteGhPagesDirectory(item.path)
              .then(() => {
                console.log(`✅ Eliminata directory: ${item.path}`);
                setTimeout(() => deleteItemSequentially(items, index + 1), 200);
              })
              .catch(error => {
                console.error(`❌ Errore directory ${item.path}: ${error}`);
                errors.push(`${item.path}: ${error}`);
                setTimeout(() => deleteItemSequentially(items, index + 1), 200);
              });
          } else {
            // Elemento sconosciuto, salta
            setTimeout(() => deleteItemSequentially(items, index + 1), 50);
          }
        }
        
        // Inizia l'eliminazione sequenziale
        deleteItemSequentially(contents);
      },
      error: function(xhr) {
        reject(`Errore nel recupero contenuti directory: ${xhr.status} - ${xhr.responseJSON?.message || 'Errore sconosciuto'}`);
      }
    });
  });
}

function deleteSelectedVersions() {
  const selectedVersions = [];
  $(".version-checkbox:checked").each(function() {
    selectedVersions.push({
      name: $(this).val(),
      path: $(this).data("path")
    });
  });
  
  if (selectedVersions.length === 0) {
    alert("⚠️ Seleziona almeno una versione da eliminare.");
    return;
  }
  
  const versionNames = selectedVersions.map(v => v.name).join(", ");
  const confirmed = confirm(
    `🗑️ ATTENZIONE!\n\n` +
    `Stai per eliminare DEFINITIVAMENTE le seguenti versioni:\n${versionNames}\n\n` +
    `Questa operazione NON può essere annullata.\n\n` +
    `Sei sicuro di voler continuare?`
  );
  
  if (!confirmed) return;
  
  // Mostra indicatore di caricamento con progresso
  $("#versionsCheckboxList").html(`
    <div style="text-align: center; padding: 20px;">
      <div class="loading-spinner">🗑️</div>
      <h4>Eliminazione in corso...</h4>
      <div id="deletionProgress">
        <p id="currentVersion">Preparazione...</p>
        <div style="background: #f0f0f0; border-radius: 10px; padding: 3px; margin: 10px 0;">
          <div id="progressBar" style="background: #dc3545; height: 20px; width: 0%; border-radius: 8px; transition: width 0.3s;"></div>
        </div>
        <p id="progressText">0 di ${selectedVersions.length} versioni elaborate</p>
      </div>
      <div id="deletionLog" style="max-height: 200px; overflow-y: auto; text-align: left; font-size: 12px; margin-top: 10px; background: #f8f9fa; padding: 10px; border-radius: 5px;"></div>
    </div>
  `);
  
  // Elimina le versioni una per una (sequenziale)
  let completed = 0;
  let errors = [];
  
  function logMessage(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    $("#deletionLog").append(`<div>[${timestamp}] ${icon} ${message}</div>`);
    $("#deletionLog").scrollTop($("#deletionLog")[0].scrollHeight);
  }
  
  function updateProgress() {
    const percentage = Math.round((completed / selectedVersions.length) * 100);
    $("#progressBar").css("width", percentage + "%");
    $("#progressText").text(`${completed} di ${selectedVersions.length} versioni elaborate`);
  }
  
  function deleteVersionSequentially(index) {
    if (index >= selectedVersions.length) {
      // Operazione completata
      if (errors.length === 0) {
        logMessage(`Eliminazione completata con successo! ${completed} versioni eliminate.`, 'success');
        setTimeout(() => {
          alert(`✅ Eliminazione completata con successo!\n\nVersioni eliminate: ${completed}`);
          $("#versionEditorModal").css("display", "none");
        }, 2000);
      } else {
        logMessage(`Eliminazione completata con ${errors.length} errori.`, 'error');
        setTimeout(() => {
          const errorDetails = errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n... e altri ${errors.length - 5} errori` : '');
          alert(`⚠️ Eliminazione completata con errori:\n\nSuccesso: ${completed}\nErrori: ${errors.length}\n\nPrimi errori:\n${errorDetails}`);
          showVersionEditor();
        }, 2000);
      }
      return;
    }
    
    const version = selectedVersions[index];
    $("#currentVersion").text(`Eliminazione versione: ${version.name} (${index + 1}/${selectedVersions.length})`);
    logMessage(`Inizio eliminazione versione: ${version.name}`);
    
    deleteGhPagesDirectory(version.path)
      .then(() => {
        completed++;
        updateProgress();
        logMessage(`Versione "${version.name}" eliminata con successo`, 'success');
        console.log(`✅ Eliminata versione: ${version.name}`);
        
        // Pausa di 1 secondo tra le versioni per evitare rate limiting
        setTimeout(() => deleteVersionSequentially(index + 1), 1000);
      })
      .catch(error => {
        completed++; // Conta anche gli errori come "completati"
        updateProgress();
        const errorMsg = `${version.name}: ${error}`;
        errors.push(errorMsg);
        logMessage(`Errore eliminazione "${version.name}": ${error}`, 'error');
        console.error(`❌ Errore eliminazione ${version.name}:`, error);
        
        // Pausa più lunga in caso di errore
        setTimeout(() => deleteVersionSequentially(index + 1), 2000);
      });
  }
  
  logMessage(`Avvio eliminazione di ${selectedVersions.length} versioni...`);
  deleteVersionSequentially(0);
}