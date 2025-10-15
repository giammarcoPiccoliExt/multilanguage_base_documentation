# Documentazione per Sviluppatori

Questa sezione contiene la documentazione tecnica per gli sviluppatori.

## Documentazione API

--8<-- "includes/developers/api.md"

## Iniziare

Per iniziare a sviluppare con la nostra piattaforma, segui questi passaggi:

1. **Registrati** per un account sviluppatore
2. **Genera** le tue chiavi API
3. **Installa** i nostri SDK
4. **Costruisci** la tua prima integrazione

## SDK e Librerie

Forniamo SDK ufficiali per diversi linguaggi di programmazione:

- **JavaScript/Node.js** - `npm install @platform/sdk`
- **Python** - `pip install platform-sdk`
- **Java** - Dipendenza Maven disponibile
- **PHP** - Pacchetto Composer disponibile

## Esempi di Codice

### Esempio di Autenticazione

```javascript
const Platform = require('@platform/sdk');

const client = new Platform({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Autentica utente
const user = await client.auth.login({
  username: 'user@example.com',
  password: 'password'
});
```

## Supporto

Per supporto tecnico:

- Consulta la nostra [documentazione API](--8<-- "includes/urls-ita.md")
- Visita il nostro [forum sviluppatori](https://developers.example.com/forum/it)
- Contatta il supporto a [developers@example.com](mailto:developers@example.com)
