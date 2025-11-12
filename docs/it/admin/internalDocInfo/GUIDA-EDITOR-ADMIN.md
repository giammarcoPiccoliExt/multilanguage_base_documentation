# Editor Admin - Guida Completa

Questo documento riunisce in un unico riferimento pratico tutte le note tecniche e funzionali sull'editor admin. Le informazioni provengono dai file di dettaglio presenti nella cartella `internalDocInfo` e sono state armonizzate per facilitare l'onboarding e l'utilizzo quotidiano.

## 1. Come utilizzare l'editor

### 1.1 Avvio e autenticazione
- Compila i campi utente, repository e token quindi premi "Start".
- L'app inizializza l'editor Markdown, carica la struttura dei file, preleva lo stato del repository e avvia il caching delle immagini.
- Se una dipendenza non è pronta (es. jQuery) l'inizializzazione attende automaticamente finché tutto è disponibile.

### 1.2 Navigazione dei file
- Il pannello laterale mostra la gerarchia dei file in formato ad albero.
- Le cartelle possono essere aperte o chiuse con un click; `preConfiguration` appare sotto `docs` ed è chiusa di default.
- Seleziona un file per caricarlo nell'editor; il file attivo viene evidenziato.

### 1.3 Modifica dei contenuti Markdown
- Lavora direttamente nell'editor; le immagini vengono aggiornate in anteprima con percorsi corretti (cache o URL GitHub).
- Le scorciatoie standard (es. Ctrl+S) salvano il contenuto nel sistema di staging locale senza inviare nulla a GitHub.

### 1.4 Gestione immagini
- Usa "Carica immagine" per aggiungere un file: l'immagine entra nello staging locale con preview e metadati.
- La cache scarica tutte le immagini all'avvio (parallelamente) e le converte in data URL per renderle istantanee.
- Il pulsante "Vedi immagini" mostra una galleria con indicatori di caricamento coerenti.

### 1.5 Staging e commit
- Ogni modifica (file o immagine) compare nel pannello di staging con contatori e azioni di rimozione.
- Premi "Commit All" per inviare tutto in batch: il sistema risolve gli SHA, mostra l'avanzamento e ripete automaticamente gli upload se necessario.
- Puoi svuotare lo staging o rimuovere elementi singoli prima del commit.

### 1.6 Versioni e deploy
- Il modal "Gestisci versioni" opera sul branch `gh-pages`: elenco, selezione multipla ed eliminazione.
- Il pulsante "Deploy" modifica il workflow `Automation.yml` impostando il flag di esecuzione.

### 1.7 Suggerimenti rapidi
- Controlla il box di stato del repository per conoscere l'ultimo commit e i pending changes.
- Gli overlay di caricamento forniscono feedback chiaro durante operazioni lunghe.
- La modal immagini supporta zoom e chiusura con overlay, pulsante o tasto Escape.

## 2. Architettura del progetto
- Il codice è suddiviso in moduli specializzati (`core`, `images`, `repository`, `files`, `versions`, `deploy`, `events`) importati in `index.html` e coordinati da `app.js`.
- Ogni modulo espone funzioni dedicate: gestione inizializzazione, cache immagini, stato repo, albero file, versioni e deploy.
- `app.js` verifica il caricamento dei moduli e scrive messaggi diagnostici in console.

## 3. Navigazione file
- `addFileToTree` e `buildFileTree` costruiscono la struttura annidata, mentre `setupFolderToggle` gestisce l'apertura delle cartelle.
- La UI applica icone, gradienti, hover e animazioni per una navigazione simile a quella di un IDE.
- I file nuovi vengono aggiunti al tree senza bisogno di ricaricare l'intero repository.

## 4. Sistema immagini
- `loadImagesList` scarica l'elenco delle immagini dal repository GitHub e memorizza i contenuti in `window.cachedImages`.
- `updatePreviewImages` intercetta i percorsi relativi (images/, admin/images/, ecc.) e li sostituisce con data URL o con l'URL raw su GitHub, evitando chiamate verso localhost.
- L'upload avviene con chiamate `PUT` su GitHub e termina con un refresh della cache.
- La logica di blocco dei pattern previene richieste errate e garantisce fallback sicuri.

## 5. Staging locale
- `stageFileLocally` e `stageImageLocally` aggiungono elementi alle mappe di staging, mantenendo contenuto, SHA originale, metadati e timestamp.
- Il pannello di staging appare automaticamente al primo elemento e mostra stato "nuovo" o "modificato".
- `commitAllStaging` esegue il batch upload: recupera gli SHA correnti, effettua i `PUT`, traccia progressi e esiti, e aggiorna la cache locale.

## 6. Esperienza utente e feedback
- Le funzioni `showLoadingOverlay`, `updateLoadingProgress` e `hideLoadingOverlay` offrono un overlay con spinner, messaggi e progress live.
- Le immagini possono essere ingrandite in una modal dedicata con animazioni di apertura e chiusura.
- Tutte le operazioni critiche (cache, upload, API) mostrano feedback coerente per evitare tempi morti non spiegati.

## 7. Integrazione GitHub
- Operazioni critiche: download albero (`GET /contents`), lettura file (`GET /contents/{path}`), salvataggio (`PUT /contents/{path}`), gestione immagini (GET/PUT) e check stato repository (`GET /commits`).
- Funzioni opzionali: gestione versioni su `gh-pages` e toggling del workflow di deploy.
- Il sistema gestisce automaticamente gli SHA, i retry su conflitto e l'avanzamento delle operazioni.

## 8. Robustezza caricamento
- `initializeApp` effettua polling finché `$` non è disponibile, quindi registra l'handler `$(document).ready` e verifica che tutti i moduli siano caricati.
- Il logging in console facilita il debug di moduli mancanti o dipendenze non ancora pronte.

## 9. Asset locali richiesti
- `favicon.png` (32x32 o 48x48) in `docs/it/admin/`.
- `images/loading.gif` (16-32 px) in `docs/it/admin/images/`.
- Font Awesome 4.7 (`woff2`, `woff`, `ttf`) in `docs/it/admin/fonts/` scaricabili da CDN.
- Dopo aver copiato i file verifica che non appaiano più richieste 404 nel browser.

## 10. Come è stato costruito questo documento
- Le sezioni derivano dai file: `ALBERATURA_FILE_COMPLETATA.md`, `CACHE_IMMAGINI_COMPLETATA.md`, `FIX_CHIAMATE_LOCALHOST_COMPLETATO.md`, `FIX_JQUERY_UNDEFINED.md`, `LOADING_E_ZOOM_COMPLETATI.md`, `MAPPATURA_GITHUB_API.md`, `MODULARIZZAZIONE_COMPLETATA.md`, `README-local-assets.md`, `STAGING_LOCALE_COMPLETATO.md`, `TEST_PATTERN_BLOCKING.md`.
- Ogni tema è stato sintetizzato, deduplicando ripetizioni e aggregando i punti comuni in capitoli verticali.
- Le istruzioni d'uso (sezione 1) combinano i flussi descritti nei documenti originali in un percorso operativo coerente.

## 11. Checklist rapida
- Autenticazione completata e repo connesso.
- Albero dei file visibile e `preConfiguration` sotto `docs`.
- Cache immagini caricata (nessuna chiamata localhost).
- Staging locale popolato dopo modifiche.
- Overlay di caricamento visibili durante le operazioni lunghe.
- Asset locali presenti per evitare 404.

Questa guida fornisce una vista completa sia sull'uso quotidiano dell'editor sia sulla sua architettura tecnica, facilitando manutenzione, debug e formazione di nuovi collaboratori.
