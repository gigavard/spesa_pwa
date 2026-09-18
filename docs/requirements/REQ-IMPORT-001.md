# REQ-IMPORT-001 — Importazione di una lista da note

Stato: Implementato.

## Contesto e obiettivo

Un utente può avere già preparato la spesa in un'app di note sul telefono. Deve poter incollare l'intero testo in Spesa e trasformarlo in prodotti senza riscrivere ogni elemento.

Ogni riga non vuota rappresenta un prodotto distinto. La quantità può essere omessa, scritta con cifre oppure espressa in lettere italiane, all'inizio o alla fine della riga. Il modello dati non contiene ancora un campo note: eventuali dettagli aggiuntivi della riga restano quindi parte del nome del prodotto.

## Esperienza proposta

Un comando `Importa note` apre un pannello con:

1. un'area di testo multilinea in cui incollare le note;
2. un comando `Analizza`;
3. un'anteprima con prodotto e quantità interpretati per ogni riga;
4. un riepilogo di righe valide, duplicate o problematiche;
5. una conferma finale prima di modificare la lista condivisa.

L'anteprima permette di individuare errori del parsing prima della scrittura. Per correggere, l'utente modifica il testo incollato e ripete l'analisi. L'importazione attribuisce i prodotti all'utente attualmente selezionato.

L'esperienza proposta è stata approvata. L'importazione aggiunge prodotti alla lista corrente e non la sostituisce.

## Requisiti confermati

- `REQ-IMPORT-001.1` — Quando l'utente apre l'importazione, il sistema deve offrire un'area multilinea in cui incollare una lista proveniente da note.
- `REQ-IMPORT-001.2` — Quando il sistema analizza il testo, il sistema deve trattare ogni riga non vuota come un prodotto distinto.
- `REQ-IMPORT-001.3` — Quando una riga inizia con una quantità espressa in cifre, il sistema deve separare la quantità dal prodotto.
- `REQ-IMPORT-001.4` — Quando una riga inizia con una quantità espressa in lettere italiane supportate, il sistema deve separare la quantità dal prodotto.
- `REQ-IMPORT-001.5` — Quando una riga termina con una quantità espressa in cifre o in lettere italiane supportate, il sistema deve separare la quantità dal prodotto.
- `REQ-IMPORT-001.6` — Quando una riga non contiene una quantità riconosciuta, il sistema deve assegnare quantità 1 e usare la riga come nome del prodotto.
- `REQ-IMPORT-001.7` — Quando una riga contiene dettagli aggiuntivi dopo prodotto e quantità, il sistema deve conservarli nel nome del prodotto.
- `REQ-IMPORT-001.8` — Prima di scrivere la lista importata nel Google Sheet, il sistema deve chiedere una conferma esplicita.
- `REQ-IMPORT-001.9` — Quando l'importazione viene confermata, il sistema deve attribuire i prodotti all'utente selezionato nell'app.
- `REQ-IMPORT-001.10` — Se nessun utente è selezionato, il sistema non deve avviare la scrittura e deve chiedere di selezionare Giulio oppure Alice.
- `REQ-IMPORT-001.11` — Durante e dopo l'importazione, il sistema deve preservare la riconciliazione con il Google Sheet autorevole.
- `REQ-IMPORT-001.12` — Se l'importazione non è supportata o viene annullata, il sistema deve lasciare disponibili aggiunta manuale e inserimento vocale.
- `REQ-IMPORT-001.13` — Quando l'importazione viene confermata, il sistema deve aggiungere i risultati alla lista corrente senza rimuovere i prodotti già presenti.
- `REQ-IMPORT-001.14` — Se un prodotto importato è già presente nella lista, il sistema deve segnalarlo come duplicato, conservare nome, autore e data della voce esistente e non creare una nuova riga.
- `REQ-IMPORT-001.15` — Se la quantità importata di un duplicato è maggiore della quantità esistente, il sistema deve aggiornare la voce esistente alla quantità importata; altrimenti deve conservare la quantità esistente.
- `REQ-IMPORT-001.16` — Se più righe importate rappresentano lo stesso prodotto, il sistema deve conservare il nome della prima occorrenza, creare al massimo una voce e usare la quantità maggiore fra le occorrenze.
- `REQ-IMPORT-001.17` — Il sistema deve considerare equivalenti le righe `2 banane`, `due banane` e `banane due`, interpretandole come prodotto `Banane` con quantità 2.

## Criteri di accettazione

1. Incollando la lista di esempio, l'anteprima contiene quattro elementi:

   ```text
   2 banane morbide
   detersivo per piatti
   scottex
   fagioli scatola tre
   ```

2. La prima riga produce quantità 2 e prodotto `Banane morbide`.
3. La seconda e la terza riga producono quantità 1 e conservano tutto il testo come nome.
4. L'ultima riga produce quantità 3 e prodotto `Fagioli scatola`.
5. Quantità numeriche e quantità italiane concordate producono lo stesso valore sia all'inizio sia alla fine.
6. `2 banane`, `due banane` e `banane due` vengono mostrate come duplicati e generano al massimo una voce `Banane` con quantità 2.
7. I dettagli non interpretati come quantità restano visibili nel nome.
8. Nessuna scrittura avviene durante la sola analisi o dopo un annullamento.
9. Dopo la conferma, una rilettura del backend mostra i nuovi prodotti insieme a quelli già presenti.
10. Un duplicato con quantità importata più alta aggiorna soltanto la quantità esistente; con quantità uguale o inferiore non modifica la riga.
11. Errori e timeout non lasciano l'interfaccia bloccata.

## Fuori ambito iniziale

- campo note separato nel Google Sheet;
- interpretazione tramite modello AI;
- importazione da immagini o scansioni;
- lettura diretta di altre applicazioni senza copia e incolla;
- modifica automatica dello storico.

## Dipendenze

- parser coerente fra client e server;
- nuovo comando backend per una mutazione multipla sotto un solo `LockService` oppure una strategia equivalente definita nella specifica;
- riconciliazione finale tramite GET JSONP;
- utente locale già selezionato.

## Domande aperte

Nessuna.

Le domande `Q-IMPORT-001`, `Q-IMPORT-002`, `Q-IMPORT-003` e `Q-IMPORT-004` sono state risolte con l'esempio e le regole fornite dal product owner. La prima versione considera righe testuali semplici come nell'esempio; il supporto specifico per checkbox, punti elenco o liste numerate non è richiesto. Le quantità in lettere supportate vanno da uno a novantanove e includono `un`, `uno`, `una` e forme composte come `ventidue` e `ventitré`.

## Tracciabilità

| Artefatto | Collegamento |
|---|---|
| Specifica | [`SPEC-IMPORT-001`](../specifications/SPEC-IMPORT-001.md) |
| Piano | [`PLAN-IMPORT-001`](../plans/PLAN-IMPORT-001.md) |
| Test | `tests/apps-script.test.js`, `tests/frontend.spec.js`, `tests/sheet.spec.js` |
