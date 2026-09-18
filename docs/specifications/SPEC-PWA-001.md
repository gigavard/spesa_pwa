# SPEC-PWA-001 — Installazione Android e identità PWA

Stato: Implementato.

Requisito coperto: [`REQ-PWA-001`](../requirements/REQ-PWA-001.md).

## Interfaccia

Un pulsante `Installa app` viene inserito vicino all'intestazione, inizialmente nascosto tramite l'attributo HTML `hidden`. Il pulsante diventa visibile soltanto quando il browser emette `beforeinstallprompt` e l'app non è già in modalità standalone.

Il normale menu del browser rimane utilizzabile. Il pulsante interno è un accesso più evidente allo stesso prompt nativo e non simula un'installazione proprietaria.

## Gestione dell'evento

Il client conserva in memoria l'ultimo evento `beforeinstallprompt`:

1. chiama `preventDefault()` per rinviare il prompt;
2. mostra il pulsante;
3. al tocco nasconde il pulsante, consuma l'evento e chiama `prompt()`;
4. attende `userChoice` e mostra un messaggio coerente con accettazione o rifiuto;
5. su `appinstalled` elimina ogni evento conservato e mantiene nascosto il pulsante.

L'evento viene rimosso dalla memoria prima di attendere la scelta, così tocchi ripetuti non possono riutilizzarlo. Errori del prompt vengono mostrati nel normale spazio messaggi senza alterare lo stato della lista.

## Rilevamento standalone

Il client controlla `window.matchMedia('(display-mode: standalone)').matches`. Se il risultato è vero, il comando resta nascosto anche in presenza di eventi inattesi.

## Manifest e icone

Il manifest mantiene:

- `name` e `short_name` uguali a `Spesa`;
- `display: standalone`;
- `start_url` e `scope` relativi alla directory GitHub Pages;
- icone PNG locali 192×192 e 512×512;
- dichiarazioni separate per uso ordinario e `maskable`.

L'icona usa un carrello semplice senza testo. La composizione principale resta nella zona sicura centrale per evitare tagli nelle maschere Android. Il nome viene fornito dal manifest, non disegnato dentro l'icona.

## Service worker

Il service worker resta network-only. L'installabilità non introduce una promessa di uso offline. Non vengono aggiunte cache applicative in questo incremento.

## Strategia di test

- test browser con evento `beforeinstallprompt` simulato, verifica del pulsante, invocazione di `prompt()`, esito e impossibilità di riuso;
- test browser senza evento, verifica che il pulsante rimanga nascosto;
- validazione statica del manifest e delle dimensioni effettive dei PNG;
- verifica HTTP di manifest, service worker e icone sul sito pubblicato;
- prova manuale finale su Android per identità, icona e avvio standalone.

## Esito corrente

Pulsante, gestione degli eventi, manifest e icone sono implementati e pubblicati. L'icona sorgente è stata generata con lo strumento integrato `imagegen` usando un carrello bianco centrale su fondo verde, senza testo e nella zona sicura maskable. I test automatici e il controllo Chromium del sito pubblicato sono superati; la prova Android determina il passaggio a `Verificato`.
