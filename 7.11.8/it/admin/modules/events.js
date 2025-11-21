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
    // Aggiunge classe al body per gestire il layout quando sidebar è collapsed
    $("body").toggleClass("sidebar-collapsed");
  });

  // Delete image modal
  $("#deleteImageBtn").on("click", function() {
    showDeleteImageModal();
  });

  // Close delete image modal
  $("#closeDeleteImageModal").on("click", function() {
    $("#deleteImageModal").css("display", "none");
  });

  $("#selectAllImagesBtn").on("click", function() {
    $(".delete-image-checkbox").prop("checked", true);
  });

  $("#unselectAllImagesBtn").on("click", function() {
    $(".delete-image-checkbox").prop("checked", false);
  });

  $("#confirmDeleteImageBtn").on("click", function() {
    confirmDeleteImage();
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

  // Delete File Modal Events
  $("#deleteFileBtn").on("click", function() {
    showDeleteFileModal();
  });

  $("#closeDeleteFileModal").on("click", function() {
    $("#deleteFileModal").css("display", "none");
  });

  $("#selectAllFilesBtn").on("click", function() {
    $(".delete-file-checkbox").prop("checked", true);
  });

  $("#unselectAllFilesBtn").on("click", function() {
    $(".delete-file-checkbox").prop("checked", false);
  });

  $("#confirmDeleteFileBtn").on("click", function() {
    confirmDeleteFile();
  });
}

// Initialize event handlers when DOM is ready
$(document).ready(function() {
  setupEventHandlers();
});