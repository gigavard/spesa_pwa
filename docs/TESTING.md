# Politica di test

Stato: Approvato.

## Livelli di verifica

1. I controlli sintattici verificano che i file JavaScript siano analizzabili.
2. I test frontend usano il checkout locale e un backend simulato per riprodurre errori, ritardi e concorrenza in modo deterministico.
3. I test con backend pubblicato verificano l'integrazione reale con Apps Script e Google Sheet.
4. Gli smoke test verificano la raggiungibilità delle versioni pubblicate senza modificare dati applicativi.

## Uso del foglio condiviso

Il product owner ha autorizzato esplicitamente l'uso del Google Sheet condiviso per i test di sviluppo.

Per conservare risultati leggibili e non confonderli con la spesa reale:

- i prodotti creati automaticamente usano un nome univoco riconoscibile come dato di test;
- ogni test CRUD elimina soltanto i dati creati dalla propria esecuzione;
- il test verifica lo stato persistito con una nuova lettura, perché la risposta POST `no-cors` è opaca;
- una pulizia fallita viene segnalata e non viene nascosta;
- i test concorrenti sul foglio sono serializzati;
- non si inseriscono credenziali o dati personali nel repository.

La chiusura della spesa sposta l'intera lista nello storico e la cancellazione dello storico elimina dati condivisi. Queste operazioni non possono essere isolate tramite il solo nome univoco del prodotto. I relativi test sul foglio condiviso devono quindi essere eseguiti in una finestra concordata o mediante un ambiente di test separato. L'autorizzazione generale a usare il foglio non implica la cancellazione indiscriminata dei dati presenti.

## Evidenze

I test di integrazione devono conservare almeno:

- identificativo univoco dei dati di test;
- operazioni eseguite;
- stato osservato dal browser;
- stato riletto dal backend;
- esito della pulizia.
