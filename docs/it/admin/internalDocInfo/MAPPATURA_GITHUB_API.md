# 🔍 **MAPPATURA COMPLETA CHIAMATE GITHUB API**

## 📊 **Panoramica Generale**

Ecco **TUTTE** le funzioni che accedono a GitHub API nel nostro editor, divise per modulo e criticità:

---

## 🖼️ **MODULO IMAGES (`modules/images.js`)**

### **1. `loadImagesList()` - CRITICA ⭐⭐⭐**
```javascript
// Chiamata: GET /repos/{owner}/{repo}/contents/overrides/assets/images/extract/media
url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/overrides/assets/images/extract/media`
```
**Quando viene chiamata:**
- ✅ **Startup dell'editor** (automatico)
- ✅ **Dopo upload nuova immagine** (refresh cache)
- ✅ **Click pulsante "Mostra Immagini"** se cache vuota (fallback)

**Cosa fa:**
- Scarica la lista di tutte le immagini dalla directory GitHub
- Scarica ogni immagine come blob e la converte in dataURL per la cache
- **ESSENZIALE**: Senza questa funzione non funziona niente delle immagini

### **2. `uploadImage(file)` - CRITICA ⭐⭐⭐**  
```javascript
// Chiamata: PUT /repos/{owner}/{repo}/contents/overrides/assets/images/extract/media/{filename}
url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/overrides/assets/images/extract/media/${file.name}`
```
**Trigger:** Click pulsante "Carica Immagine" + selezione file
**Cosa fa:**
- Converte immagine in base64
- Carica l'immagine su GitHub nella directory assets
- **ESSENZIALE**: Unico modo per aggiungere immagini al repository

---

## 📁 **MODULO FILES (`modules/files.js`)**

### **3. `fetchFolder(path)` - CRITICA ⭐⭐⭐**
```javascript  
// Chiamata: GET /repos/{owner}/{repo}/contents/{path}
url: `https://api.github.com/repos/${username}/${repo}/contents/${path}`
```
**Quando viene chiamata:**
- ✅ **Startup dell'editor** (carica struttura file)
- ✅ **Espansione cartelle** nel file tree
- **ESSENZIALE**: Costruisce tutta la navigazione file

### **4. `downloadFileContent(path)` - CRITICA ⭐⭐⭐**
```javascript
// Chiamata: GET /repos/{owner}/{repo}/contents/{path}?ref={branch}  
url: `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=${branchName}`
```
**Trigger:** Click su file nel file tree
**Cosa fa:**
- Scarica il contenuto di un singolo file markdown
- **ESSENZIALE**: Senza questa non si può aprire nessun file per editare

### **5. `loadFileContent(path)` - UTILE ⭐⭐**
```javascript
// Chiamata: GET /repos/{owner}/{repo}/contents/{path}?ref=main
url: `https://api.github.com/repos/${username}/${repo}/contents/${path}?ref=main`
```
**Quando:** Caricamento contenuto file per preview
**Criticità:** Utile ma non essenziale

### **6. `saveAllChanges()` - CRITICA ⭐⭐⭐**
```javascript
// Chiamata 1: GET per ottenere SHA corrente
url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/${change.path}?ref=main`

// Chiamata 2: PUT per salvare il file  
url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/contents/${change.path}`
```
**Trigger:** Click pulsante "Salva Modifiche" 
**Cosa fa:**
- Ottiene SHA corrente del file (per evitare conflitti)
- Salva il contenuto modificato su GitHub
- **ESSENZIALE**: Unico modo per salvare i cambiamenti

---

## 🔄 **MODULO VERSIONS (`modules/versions.js`)**

### **7. `loadVersions()` - OPZIONALE ⭐**
```javascript
// Chiamata: GET /repos/{owner}/{repo}/contents/?ref=gh-pages
url: `https://api.github.com/repos/${username}/${repo}/contents/?ref=gh-pages`
```
**Trigger:** Click pulsante "Gestisci Versioni"
**Criticità:** Feature avanzata, non essenziale per editing base

### **8. `loadVersionContent(dirPath)` - OPZIONALE ⭐**
```javascript
// Chiamata: GET /repos/{owner}/{repo}/contents/{dirPath}?ref=gh-pages  
url: `https://api.github.com/repos/${username}/${repo}/contents/${dirPath}?ref=gh-pages`
```
**Quando:** Navigazione versioni in gh-pages branch
**Criticità:** Feature avanzata per gestione versioni

### **9. `deleteVersionItem(item)` - OPZIONALE ⭐**
```javascript
// Chiamate multiple per eliminare file/cartelle da gh-pages
url: `https://api.github.com/repos/${username}/${repo}/contents/${item.path}`
```
**Trigger:** Eliminazione versioni
**Criticità:** Gestione avanzata versioni

---

## 📊 **MODULO REPOSITORY (`modules/repository.js`)**

### **10. `checkRepoStatus()` - UTILE ⭐⭐**
```javascript
// Chiamata: GET /repos/{owner}/{repo}/commits?per_page=1
url: `https://api.github.com/repos/${window.currentUsername}/${window.currentRepo}/commits?per_page=1`
```
**Quando:** Startup dell'editor (verifica stato repo)  
**Cosa fa:** Controlla ultimo commit per verificare stato repository
**Criticità:** Utile per feedback ma non blocca funzionalità

---

## 🚀 **MODULO DEPLOY (`modules/deploy.js`)**

### **11. `deployDocs()` - OPZIONALE ⭐**
```javascript
// Chiamata: GET /repos/{owner}/{repo}/contents/.github/workflows/Automation.yml
url: `https://api.github.com/repos/${username}/${repo}/contents/.github/workflows/Automation.yml`
```
**Trigger:** Click pulsante "Deploy"
**Criticità:** Feature di deployment, non essenziale per editing

---

## 🎯 **RISPOSTA ALLA TUA DOMANDA:**

### **Quando premi "Carica Immagine" succede questo:**

1. **📎 Selezione File** → Trigger evento upload
2. **🔄 `uploadImage(file)`** → Conversione in base64  
3. **📤 GitHub API PUT** → `PUT /contents/overrides/assets/images/extract/media/{filename}`
4. **✅ Successo** → Alert "Immagine caricata!"
5. **🔄 `loadImagesList()`** → Refresh automatico cache immagini

---

## 🚨 **FUNZIONI ESSENZIALI vs OPZIONALI:**

### **🔴 CRITICHE (Senza queste l'editor non funziona):**
- `loadImagesList()` - Cache immagini
- `uploadImage()` - Upload immagini  
- `fetchFolder()` - Navigazione file
- `downloadFileContent()` - Apertura file
- `saveAllChanges()` - Salvataggio

### **🟡 UTILI (Migliorano UX ma non bloccanti):**
- `checkRepoStatus()` - Stato repository
- `loadFileContent()` - Preview file

### **🟢 OPZIONALI (Feature avanzate):**
- Tutte le funzioni di `versions.js` (gestione versioni)
- `deployDocs()` (deployment automatico)

**Conclusione: Le prime 6 funzioni sono ESSENZIALI, le altre sono enhancement!** 🎯