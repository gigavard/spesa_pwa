# Politica di test

Stato: Approvato.

## Livelli di verifica

1. I controlli sintattici verificano che i file JavaScript siano analizzabili.
2. I test frontend usano il checkout locale e un backend simulato per riprodurre errori, ritardi e concorrenza in modo deterministico.
3. I test con backend pubblicato verificano l'integrazione reale con Apps Script e Google Sheet.
4. Gli smoke test verificano la raggiungibilità delle versioni pubblicate senza modificare dati applicativi.

## Uso dei fogli Google

`ListaSpesa` contiene dati reali ed è escluso da qualsiasi test che modifichi dati. I test di sviluppo che scrivono sul backend devono impostare esplicitamente `testMode: true` e usare soltanto `ListaSpesaTest`.

Per conservare risultati leggibili e non confonderli con la spesa reale:

- i prodotti creati automaticamente usano un nome univoco riconoscibile come dato di test;
- prima della prima scrittura il test richiede `action=ambiente` e pretende la conferma esplicita di `ListaSpesaTest`;
- ogni test CRUD o import bulk elimina soltanto i dati creati dalla propria esecuzione;
- il test verifica lo stato persistito con una nuova lettura, perché la risposta POST `no-cors` è opaca;
- una pulizia fallita viene segnalata e non viene nascosta;
- i test concorrenti sul foglio sono serializzati;
- non si inseriscono credenziali o dati personali nel repository.

La chiusura della spesa sposta l'intera lista nello storico e la cancellazione dello storico elimina dati condivisi. Queste operazioni non possono essere isolate tramite il solo nome univoco del prodotto. Anche su `ListaSpesaTest` devono quindi essere eseguite solo in una finestra concordata o su dati predisposti appositamente. Non devono mai essere eseguite automaticamente su `ListaSpesa`.

## Evidenze

I test di integrazione devono conservare almeno:

- identificativo univoco dei dati di test;
- operazioni eseguite;
- stato osservato dal browser;
- stato riletto dal backend;
- esito della pulizia.
