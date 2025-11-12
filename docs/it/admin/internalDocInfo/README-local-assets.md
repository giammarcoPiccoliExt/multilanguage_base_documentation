# Asset locali per editor admin

Inserire i seguenti file per eliminare 404:

* `docs/it/admin/favicon.png` (32x32 o 48x48 PNG)
* `docs/it/admin/images/loading.gif` (spinner GIF 16-32px)
* FontAwesome 4.7 font files in `docs/it/admin/fonts/`:
  * fontawesome-webfont.woff2
  * fontawesome-webfont.woff
  * fontawesome-webfont.ttf

## Come ottenere i file

Scarica da CDN:

```text
https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff2
https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.woff
https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/fonts/fontawesome-webfont.ttf
```

## Verifica

Avvia server e controlla che non appaiano richieste 404 per /fonts/, /images/loading.gif e /favicon.ico.
