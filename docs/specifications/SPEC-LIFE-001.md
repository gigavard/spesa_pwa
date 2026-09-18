# SPEC-LIFE-001 — Lista senza stato e chiusura completa

Stato: Verificato.

Requisito coperto: [`REQ-LIFE-001`](../requirements/REQ-LIFE-001.md).
Decisione: [`ADR-002`](../decisions/ADR-002-rimozione-stato-lista.md).

## Modello dati risultante

`Lista Spesa` usa quattro colonne applicative:

| Posizione | Campo |
|---|---|
| A | prodotto |
| B | quantità |
| C | data inserimento |
| D | autore |

`Storico` resta invariato con prodotto, quantità e data della spesa nelle colonne A-C.

## Comportamento backend

- `getListaSpesa()` legge A-D e restituisce ogni riga con un prodotto non vuoto.
- `aggiungiProdotto()` inserisce quattro valori e non scrive uno stato.
- `trovaProdotto()` cerca fra tutte le righe con prodotto non vuoto usando la normalizzazione esistente.
- `chiudiSpesa()` legge A-D, prepara una riga storica per ogni prodotto non vuoto e, dopo la scrittura nello storico, cancella i contenuti A-D della lista.
- Le intestazioni non vengono cancellate.

Il contratto HTTP non cambia. La risposta della lista continua a contenere soltanto `prodotto` e `quantita`.

## Migrazione

Una funzione Apps Script non esposta tramite `doGet` o `doPost` esegue la migrazione sotto `LockService`:

1. legge l'intestazione E1;
2. se l'intestazione normalizzata è `stato`, elimina la colonna E e forza il flush;
3. se E1 è vuota, considera lo schema già privo della colonna applicativa e non modifica il foglio;
4. se E1 contiene un valore diverso, interrompe la migrazione con errore per non eliminare dati non riconosciuti.

Il backend a quattro colonne è compatibile con il foglio precedente durante la finestra fra deploy e migrazione, perché ignora la quinta colonna. La migrazione viene quindi eseguita dopo il deploy del backend aggiornato.

## Integrità della chiusura

Scrittura nello storico e pulizia della lista restano nello stesso lock. La lista viene cancellata soltanto dopo che `setValues()` sullo storico non ha generato errori. `SpreadsheetApp.flush()` conclude la mutazione.

## Strategia di test

Un test Node esegue `apps-script/code.gs` in un contesto isolato con implementazioni controllate di `SpreadsheetApp`, `Utilities` e `LockService`. Deve verificare:

- lettura di righe indipendentemente dal vecchio valore della quinta colonna;
- aggiunta di quattro valori;
- ricerca dei duplicati senza stato;
- archiviazione di tutti i prodotti e cancellazione delle sole quattro colonne dati;
- migrazione con intestazione `Stato`, caso già migrato e protezione da intestazione inattesa.

Il test browser esistente verifica il contratto frontend e non richiede modifiche funzionali.

## Esito

La soluzione è stata pubblicata nel deployment Apps Script versione 17. La migrazione è stata eseguita con esito positivo e la rotta HTTP temporanea necessaria a invocarla è stata rimossa dalla versione finale. Test backend, frontend e CRUD sul foglio reale sono passati.
