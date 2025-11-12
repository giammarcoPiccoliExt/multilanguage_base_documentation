/* ================== EVENT HANDLERS - WIRING ================== */

// Event handlers setup - called after DOM is ready
function setupEventHandlers() {
  // Configuration and login
  $("#startBtn").on("click", handleStartClick);

  // File management events
  $(document).on("click", ".open-repo-file", function() {
    const filePath = $(this).data("path");
    if (!window.currentUsername || !window.currentRepo || !window.currentToken) {
      alert("Configurazione mancante! Fai login prima.");
      return;
    }
    loadFile(filePath, window.currentUsername, window.currentRepo, window.currentToken);
  });

  $("#newFileBtn").on("click", createNewFile);
  $("#refreshRepoBtn").on("click", function() {
    if (!window.currentUsername || !window.currentRepo || !window.currentToken) {
      alert("Configurazione mancante! Fai login prima.");
      return;
    }
    loadFiles(window.currentUsername, window.currentRepo, window.currentToken);
  });

  // Nuovo pulsante carica immagine - apre modale
  $("#uploadImageBtn").on("click", function() {
    $("#uploadImageModal").css("display", "block");
    $("#imageFileInput").val("");
    $("#imagePreviewContainer").hide();
    $("#confirmUploadImageBtn").prop("disabled", true);
  });

  // Preview dell'immagine selezionata nella modale
  $("#imageFileInput").on("change", function() {
    const file = this.files[0];
    if (file) {
      // Controlla se è un'immagine
      if (!file.type.startsWith('image/')) {
        alert("❌ Seleziona solo file immagine!");
        return;
      }
      
      // Mostra preview
      const reader = new FileReader();
      reader.onload = function(e) {
        $("#imagePreview").attr("src", e.target.result);
        $("#imageInfo").html(`
          <strong>${file.name}</strong><br>
          Dimensione: ${(file.size / 1024).toFixed(1)} KB<br>
          Tipo: ${file.type}
        `);
        $("#imagePreviewContainer").show();
        $("#confirmUploadImageBtn").prop("disabled", false);
      };
      reader.readAsDataURL(file);
    } else {
      $("#imagePreviewContainer").hide();
      $("#confirmUploadImageBtn").prop("disabled", true);
    }
  });

  // Conferma caricamento immagine
  $("#confirmUploadImageBtn").on("click", function() {
    const file = $("#imageFileInput")[0].files[0];
    if (file) {
      $("#uploadImageModal").css("display", "none");
      uploadImage(file);
    }
  });

  // Chiudi modale carica immagine
  $("#closeUploadImageModal, #cancelUploadImageBtn").on("click", function() {
    $("#uploadImageModal").css("display", "none");
  });





  // Click image to enlarge in modal
  $(document).on("click", ".img-preview-large", function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const imageSrc = $(this).data('fullsize-src') || $(this).attr('src');
    const imageName = $(this).data('img-name') || $(this).attr('alt');
    
    console.log("🔍 Apertura immagine ingrandita:", imageName);
    showImageModal(imageSrc, imageName);
  });



  // Modal background click to close
  $(document).on("click", ".modal-bg", function(e) {
    if (e.target === this) {
      $(this).css("display", "none");
    }
  });

  // Deploy button
  $("#deployBtn").on("click", () => { 
    editAutomationYaml(true, () => setTimeout(() => editAutomationYaml(false), 5000)); 
  });

  // Version Editor button
  $("#versionEditorBtn").on("click", showVersionEditor);

  // Sidebar toggle
  $("#sidebar-toggle").on("click", function() {
    $("#sidebar").toggleClass("collapsed");
    if($("#sidebar").hasClass("collapsed")) {
      $("#sidebar").css("left", "-280px");
      $("#editor").css("margin-left", "0");
    } else {
      $("#sidebar").css("left", "0");
      $("#editor").css("margin-left", "280px");
    }
  });

  // Delete image modal
  $("#deleteImageBtn").on("click", function() {
    // Usa la cache per mostrare le immagini da eliminare
    if (!window.cachedImages || window.cachedImages.length === 0) {
      alert("Nessuna immagine disponibile da eliminare.");
      return;
    }
    
    let html = '<ul class="delete-image-list">';
    window.cachedImages.forEach(f => {
      const fileName = f.name || f.local;
      html += `<li class='delete-image-item'><label><input type='radio' name='deleteImageRadio' value='${fileName}' class='delete-image-radio'>${fileName}</label></li>`;
    });
    html += '</ul>';
    $("#deleteImageList").html(html);
    window.selectedImageToDelete = null;
    $("#deleteImageModal").css("display", "block");
  });

  // Close delete image modal
  $("#closeDeleteImageModal").on("click", function() {
    $("#deleteImageModal").css("display", "none");
  });

  // Version Editor Modal Events
  $("#closeVersionEditorModal").on("click", function() {
    $("#versionEditorModal").css("display", "none");
  });

  $("#selectAllVersionsBtn").on("click", function() {
    $(".version-checkbox:not(:disabled)").prop("checked", true);
  });

  $("#unselectAllVersionsBtn").on("click", function() {
    $(".version-checkbox").prop("checked", false);
  });

  $("#deleteSelectedVersionsBtn").on("click", deleteSelectedVersions);
  
  // Staging Events
  $("#commitAllBtn").on("click", function() {
    commitAllStaging();
  });
  
  $("#clearStagingBtn").on("click", function() {
    if (confirm("🗑️ Rimuovere tutte le modifiche dallo staging?\n\nQuesta azione non può essere annullata.")) {
      clearStaging();
    }
  });
  
  // New File Modal Events
  $("#closeNewFileModal").on("click", function() {
    $("#newFileModal").css("display", "none");
  });
  
  $("#confirmCreateFileBtn").on("click", function() {
    confirmCreateFile();
  });
  
  // Aggiorna path quando si digita il nome file
  $("#newFileName").on("input", function() {
    updateFullPath();
  });
}

// Initialize event handlers when DOM is ready
$(document).ready(function() {
  setupEventHandlers();
});