# REQ-SYNC-001 — Protezione da riconciliazioni obsolete

Stato: Verificato

## Contesto e obiettivo

Il frontend applica le modifiche localmente e rilegge il Google Sheet in background. Una lettura avviata dopo una mutazione precedente può terminare mentre una nuova mutazione è in corso. Il risultato vecchio non deve sostituire lo stato locale più recente.

Questo incremento applica il vincolo già presente nelle istruzioni del progetto: impedire che riconciliazioni obsolete sovrascrivano lo stato recente. Non cambia le regole funzionali della lista.

## Requisiti

- `REQ-SYNC-001.1` — Quando inizia una nuova mutazione, il sistema deve invalidare le riconciliazioni avviate prima della mutazione.
- `REQ-SYNC-001.2` — Se una riconciliazione invalidata riceve una risposta dal backend, il sistema deve ignorare quella risposta.
- `REQ-SYNC-001.3` — Quando la nuova mutazione termina, il sistema deve avviare una riconciliazione che possa aggiornare la UI con lo stato autorevole più recente.
- `REQ-SYNC-001.4` — Mentre una mutazione è in corso, il sistema deve preservare lo stato ottimistico prodotto da quella mutazione rispetto alle risposte di letture precedenti.

## Criteri di accettazione

1. Data una riconciliazione pendente, quando l'utente avvia una nuova mutazione e la vecchia lettura termina, la UI non applica il risultato della vecchia lettura.
2. Al termine della nuova mutazione, una nuova lettura può aggiornare la UI con lo stato restituito dal backend.
3. I comandi tornano utilizzabili dopo la mutazione.
4. Il contratto API, il formato del foglio e il comportamento ottimistico esistente non cambiano.

## Fuori ambito

- aggiornamenti automatici fra dispositivi;
- modifica dei timeout o del numero di tentativi;
- autenticazione e autorizzazione;
- modifica delle regole CRUD.

## Dipendenze

- backend autorevole raggiunto tramite `leggiLista()`;
- contatore `reconcileToken` già presente nel client.

## Domande aperte

Nessuna. Il comportamento è determinato dai vincoli esistenti.

## Tracciabilità

| Artefatto | Collegamento |
|---|---|
| Specifica | [`SPEC-SYNC-001`](../specifications/SPEC-SYNC-001.md) |
| Piano | [`PLAN-SYNC-001`](../plans/PLAN-SYNC-001.md) |
| Test | `tests/frontend.spec.js`, caso marcato `REQ-SYNC-001` |

## Esito della verifica

Il 18 settembre 2026 il test browser `REQ-SYNC-001: stale reconciliation cannot overwrite a newer optimistic mutation` è stato eseguito con Chromium ed è passato. Nella stessa esecuzione sono passati anche gli altri due test frontend esistenti.
