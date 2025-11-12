/* ================== APP.JS - ENTRY POINT & ORCHESTRATOR ================== */

// Questo file ora funge da entry point principale e orchestrator
// Tutti i moduli specifici sono stati spostati in /modules/

console.log("🎯 Editor Markdown Modulare - Caricamento completato!");
console.log("📁 Moduli caricati:", [
  "✅ core.js - Configurazione base",
  "✅ images.js - Gestione immagini", 
  "✅ repository.js - Stato repository",
  "✅ files.js - Gestione file",
  "✅ versions.js - Version editor",
  "✅ deploy.js - Deploy automation",
  "✅ events.js - Event handlers"
]);

// Verifica che jQuery sia caricato prima di procedere
function initializeApp() {
  if (typeof $ === 'undefined') {
    console.log("⏳ Attendo caricamento jQuery...");
    // Riprova dopo un breve delay
    setTimeout(initializeApp, 50);
    return;
  }
  
  console.log("✅ jQuery disponibile, inizializzo app...");
  
  // Aspetta che il DOM sia pronto prima di verificare i moduli
  $(document).ready(function() {
    console.log("✅ DOM ready, verifico moduli...");
  
    // Verifica che tutte le funzioni principali siano disponibili
  const requiredFunctions = [
    'handleStartClick', 'initEditor', 'getCurrentCredentials',
    'loadImagesList', 'uploadImage',
    'updateRepoStatusBox', 'checkRepoStatus', 
    'loadFiles', 'loadFile', 'pushAllChanges',
    'showVersionEditor', 'deleteSelectedVersions',
    'editAutomationYaml',
    'setupEventHandlers'
  ];
  
  const missingFunctions = requiredFunctions.filter(fn => typeof window[fn] === 'undefined');
  
  if (missingFunctions.length === 0) {
    console.log("✅ Tutti i moduli caricati correttamente!");
  } else {
    console.error("❌ Funzioni mancanti:", missingFunctions);
  }
  
  }); // Fine $(document).ready()
}

// Avvia l'inizializzazione
initializeApp();