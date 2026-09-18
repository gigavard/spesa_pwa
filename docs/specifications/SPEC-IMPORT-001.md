# SPEC-IMPORT-001 — Importazione bulk da note

Stato: Implementato.

Requisito coperto: [`REQ-IMPORT-001`](../requirements/REQ-IMPORT-001.md).

## Interfaccia

Un pulsante `Importa note` apre un pannello inline, senza sostituire la vista della lista. Il pannello contiene:

- textarea multilinea con esempio sintetico;
- pulsante `Analizza`;
- anteprima di ogni riga non vuota con quantità, prodotto e stato;
- riepilogo di nuovi prodotti, duplicati e aggiornamenti di quantità;
- pulsante finale `Importa nella lista`;
- pulsante `Annulla`.

La sola analisi non modifica `listaCorrente` e non invia POST. Se il testo cambia dopo l'analisi, anteprima e conferma vengono invalidate finché l'utente non analizza di nuovo.

Il pulsante finale costituisce la conferma esplicita. Se manca l'utente, la scrittura non parte.

## Parsing delle righe

Client e server implementano lo stesso algoritmo deterministico:

1. dividere su newline;
2. applicare `trim()` e ignorare righe vuote;
3. compattare gli spazi interni;
4. cercare la quantità nel primo token;
5. soltanto se il primo token non è una quantità, cercarla nell'ultimo;
6. rimuovere il token quantità e usare tutto il testo restante come prodotto;
7. se nessuna quantità è riconosciuta, usare quantità 1 e l'intera riga come prodotto;
8. normalizzare la presentazione del prodotto con iniziale maiuscola, come nel parser esistente.

La precedenza del primo token rende deterministico un caso anomalo con quantità a entrambe le estremità: quella iniziale viene usata e il token finale resta nel nome.

Le quantità in cifre accettano interi positivi. Le quantità in lettere coprono 1-99:

- `un`, `uno`, `una`;
- forme da `due` a `diciannove`;
- decine da `venti` a `novanta`;
- forme composte unite, incluse le elisioni davanti a uno e otto e gli accenti normalizzati, per esempio `ventuno`, `ventotto`, `ventitré`.

## Duplicati nell'anteprima

Ogni riga resta visibile nell'anteprima. Una mappa basata su `normalizzaClient(prodotto)` individua equivalenze:

- la prima occorrenza determina il nome da usare per un prodotto nuovo;
- occorrenze successive sono marcate duplicate;
- la quantità candidata è il massimo fra tutte le occorrenze;
- se il prodotto esiste già in `listaCorrente`, l'anteprima preserva il nome esistente e indica se la quantità rimane invariata o aumenta.

## Contratto API

Viene aggiunta l'azione POST `importa`:

```json
{
  "action": "importa",
  "testo": "due banane\nscottex",
  "utente": "Alice"
}
```

Il backend ripete parsing e deduplicazione senza fidarsi dell'anteprima client. Sotto un unico `LockService`:

1. legge una volta `Lista Spesa`;
2. indicizza i prodotti esistenti per nome normalizzato;
3. per i duplicati aggiorna B soltanto quando la quantità importata è maggiore;
4. per i nuovi prodotti prepara righe A-D con data e autore;
5. scrive i nuovi prodotti in blocco;
6. esegue `SpreadsheetApp.flush()` se ci sono modifiche.

La risposta applicativa contiene conteggi di nuovi prodotti, quantità aggiornate e duplicati invariati, ma resta opaca al frontend per `no-cors`. Il client applica lo stesso risultato in modo ottimistico e rilegge il backend per riconciliare.

Nome, data e autore delle righe esistenti non vengono modificati. Nessuna riga corrente viene eliminata.

## Errori e concorrenza

- testo privo di righe valide: nessun POST;
- prodotto vuoto dopo la rimozione della quantità: la riga usa il testo originale con quantità 1, evitando righe senza nome;
- errore o timeout POST: messaggio tramite il flusso esistente e riconciliazione comunque avviata;
- comandi disabilitati durante la mutazione bulk;
- token di riconciliazione invalidato all'inizio tramite `setBusy(true)`;
- lock sempre rilasciato in `finally`.

## Strategia di test

Test backend isolati:

- numeri italiani rappresentativi 1-99, inclusi accenti ed elisioni;
- quantità all'inizio, alla fine e assente;
- lista di esempio concordata;
- duplicati interni con massimo;
- duplicati rispetto al foglio con quantità minore, uguale e maggiore;
- scrittura bulk dei soli prodotti nuovi e conservazione dei metadati esistenti.

Test browser:

- apertura, incolla, analisi e anteprima della lista di esempio;
- nessun POST durante l'analisi;
- invalidazione dell'anteprima dopo modifica;
- duplicati equivalenti `2 banane`, `due banane`, `banane due`;
- conferma manuale, un solo POST, aggiornamento ottimistico e riconciliazione;
- lista manuale e voce ancora utilizzabili dopo annullamento o errore.

Test con foglio reale:

- importazione di prodotti univoci chiaramente identificati;
- duplicato con quantità maggiore;
- rilettura indipendente e pulizia mirata delle sole righe di test.
