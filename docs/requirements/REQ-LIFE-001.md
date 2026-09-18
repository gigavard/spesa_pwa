# REQ-LIFE-001 — Chiusura completa della spesa

Stato: Verificato.

## Contesto e obiettivo

La lista corrente contiene esclusivamente ciò che resta da acquistare. Quando la spesa è conclusa, tutti gli elementi della lista sono considerati acquistati, vengono trasferiti nello storico e la lista viene azzerata.

In questa fase del prodotto non viene gestito il caso di un articolo non trovato al supermercato. Non esiste quindi una chiusura parziale né una distinzione funzionale fra più stati degli elementi.

## Requisiti

- `REQ-LIFE-001.1` — Mentre un prodotto si trova nella lista corrente, il sistema deve considerarlo da acquistare.
- `REQ-LIFE-001.2` — Quando l'utente conferma che la spesa è fatta, il sistema deve registrare nello storico tutti i prodotti presenti nella lista corrente con le rispettive quantità.
- `REQ-LIFE-001.3` — Quando tutti i prodotti sono stati registrati nello storico, il sistema deve azzerare la lista corrente preservandone le intestazioni.
- `REQ-LIFE-001.4` — Mentre un prodotto si trova nello storico, il sistema deve considerarlo acquistato.
- `REQ-LIFE-001.5` — Se la lista corrente è vuota, il sistema non deve creare righe nello storico e deve informare l'utente che la lista è già vuota.
- `REQ-LIFE-001.6` — Prima di chiudere la spesa, il sistema deve chiedere conferma all'utente.

## Criteri di accettazione

1. Con una lista contenente più prodotti, una chiusura confermata aggiunge tutti i prodotti allo storico una sola volta e lascia vuota la lista.
2. Le quantità archiviate coincidono con quelle presenti al momento della chiusura.
3. Le intestazioni di `Lista Spesa` e `Storico` restano invariate.
4. Una chiusura annullata non modifica lista o storico.
5. Una chiusura su lista vuota non modifica lo storico.
6. Nessun prodotto viene mantenuto nella lista come “non trovato”.

## Fuori ambito

- chiusura parziale della spesa;
- prodotti non disponibili o da rimandare alla spesa successiva;
- resi e correzioni dello storico;
- categorie o stato di acquisto per singolo prodotto.

## Dipendenze

- conferma già presente nel frontend;
- fogli `Lista Spesa` e `Storico` con intestazioni esistenti;
- serializzazione della mutazione tramite `LockService`.

## Domande aperte

Nessuna.

`Q-LIFE-001` è stata risolta il 18 settembre 2026: la colonna E `stato` deve essere rimossa fisicamente. La decisione è registrata in [`ADR-002`](../decisions/ADR-002-rimozione-stato-lista.md).

## Tracciabilità

| Artefatto | Collegamento |
|---|---|
| Decisione sul modello dati | [`ADR-002`](../decisions/ADR-002-rimozione-stato-lista.md) |
| Specifica | [`SPEC-LIFE-001`](../specifications/SPEC-LIFE-001.md) |
| Piano | [`PLAN-LIFE-001`](../plans/PLAN-LIFE-001.md) |
| Test backend | `tests/apps-script.test.js`, casi marcati `REQ-LIFE-001` e `ADR-002` |
| Test con foglio reale | `tests/sheet.spec.js` |

## Esito della verifica

Il 18 settembre 2026:

- 6 test backend isolati hanno verificato schema, duplicati, chiusura completa e migrazione;
- il backend a quattro colonne è stato pubblicato come deployment versione 17;
- la migrazione ha restituito `migrato: true` e ha rimosso fisicamente la colonna `Stato`;
- la lettura pubblicata ha restituito una lista valida;
- il test CRUD sul Google Sheet reale ha verificato aggiunta, incremento, decremento, eliminazione, riconciliazione e pulizia del prodotto di prova;
- la rotta temporanea usata per invocare la migrazione è stata rimossa e verificata come non riconosciuta.

La chiusura completa non è stata eseguita sul foglio condiviso durante la verifica, perché avrebbe trasferito nello storico anche eventuali prodotti reali. Il comportamento è coperto dal test backend isolato.
