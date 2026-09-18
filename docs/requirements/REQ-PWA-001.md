# REQ-PWA-001 — Installazione Android

Stato: Implementato.

## Contesto e obiettivo

L'app deve poter essere installata su Android e avviata dalla schermata home con un'identità riconoscibile. L'utente ha richiesto un pulsante nell'app, il nome `Spesa` e un carrello della spesa come icona.

## Requisiti

- `REQ-PWA-001.1` — Dove il browser rende disponibile l'installazione della PWA, il sistema deve mostrare un pulsante di installazione nell'app.
- `REQ-PWA-001.2` — Quando l'utente attiva il pulsante di installazione, il sistema deve mostrare il prompt di installazione fornito dal browser.
- `REQ-PWA-001.3` — Quando l'app viene installata, Android deve presentarla con il nome `Spesa`.
- `REQ-PWA-001.4` — Quando l'app viene installata, Android deve presentarla con un'icona raffigurante un carrello della spesa.
- `REQ-PWA-001.5` — Mentre l'app è già eseguita in modalità standalone, il sistema non deve mostrare il pulsante di installazione.
- `REQ-PWA-001.6` — Se il browser non supporta o non propone l'installazione, il sistema non deve mostrare un comando inutilizzabile e deve lasciare disponibili tutte le funzioni della lista.
- `REQ-PWA-001.7` — Quando l'utente accetta o rifiuta il prompt, il sistema deve comunicare l'esito senza bloccare l'interfaccia.

## Criteri di accettazione

1. Un evento di installazione disponibile rende visibile il pulsante.
2. Il pulsante invoca una sola volta il prompt associato all'evento disponibile.
3. Dopo la scelta, il pulsante viene nascosto finché il browser non fornisce un nuovo evento valido.
4. In assenza dell'evento, il pulsante resta nascosto e la lista funziona normalmente.
5. Il manifest usa `Spesa` come nome e nome breve.
6. Il manifest usa icone locali 192×192 e 512×512, inclusa una variante dichiarata `maskable`.
7. Manifest, icone e service worker sono raggiungibili dalla versione pubblicata.
8. Su Android l'app può essere installata, appare come `Spesa` con il carrello e si apre in modalità standalone.

## Fuori ambito

- funzionamento offline;
- installazione iOS;
- notifiche push;
- sincronizzazione in background;
- pubblicazione su Google Play Store.

## Dipendenze

- pubblicazione HTTPS tramite GitHub Pages;
- manifest e service worker già presenti;
- supporto del browser all'evento `beforeinstallprompt`.

## Domande aperte

Nessuna per l'implementazione iniziale. La resa finale dell'icona verrà verificata visivamente e potrà essere affinata senza cambiare il requisito.

## Tracciabilità

| Artefatto | Collegamento |
|---|---|
| Specifica | [`SPEC-PWA-001`](../specifications/SPEC-PWA-001.md) |
| Piano | [`PLAN-PWA-001`](../plans/PLAN-PWA-001.md) |
| Test manifest | `tests/manifest.test.js`, caso marcato `REQ-PWA-001` |
| Test browser | `tests/frontend.spec.js`, casi marcati `REQ-PWA-001` |

## Esito corrente

Il 18 settembre 2026 sono stati generati e controllati gli asset locali, il manifest è stato aggiornato e i test automatici sono passati: 1 test del manifest e 5 test frontend complessivi.

Restano da verificare sulla versione pubblicata la raggiungibilità degli asset e, su un dispositivo Android, nome, icona, prompt e apertura standalone. Fino a quella prova il requisito resta `Implementato`.
