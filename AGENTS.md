# Contesto del progetto

PWA in italiano per gestire una lista della spesa condivisa: prodotti, quantità, attribuzione degli inserimenti e storico delle spese completate. Privilegiare un'interfaccia semplice e utilizzabile da mobile.

## Architettura

- Frontend statico in HTML, CSS e JavaScript, senza framework né build, pubblicato su GitHub Pages. La scelta dell'utente è locale e non costituisce autenticazione.
- Backend Google Apps Script collegato allo spreadsheet attivo; Google Sheet è la fonte autorevole dei dati.
- Letture tramite GET JSONP; scritture tramite POST JSON con `no-cors`. Il frontend aggiorna la UI in modo ottimistico e rilegge la lista per riconciliarla.
- Frontend e backend hanno pubblicazioni separate. Il backend usa `clasp` e GitHub Actions per aggiornare il deployment esistente; le credenziali sono esterne al repository.

## Vincoli

- Una risposta POST opaca non conferma il successo applicativo: preservare la riconciliazione con il backend.
- Preservare il contratto API e la struttura dei fogli: `Lista Spesa` contiene prodotto, quantità, data e autore; `Storico` contiene prodotto, quantità e data. La presenza nella lista implica “da comprare”, la presenza nello storico implica “comprato”. Conservare le intestazioni.
- Identificare i prodotti tramite nome normalizzato, senza usare indici di riga nel frontend. Mantenere coerenti parsing e normalizzazione tra client e server.
- Il service worker usa la rete; non presumere disponibilità offline.
- Non inserire credenziali nel codice né usare dati reali per test distruttivi.

## Principi di sviluppo

- Preferire modifiche mirate e poche dipendenze; evitare framework o astrazioni senza una necessità concreta.
- Serializzare le mutazioni del foglio con `LockService`.
- Gestire errori e timeout, rilasciare sempre il blocco dei comandi e impedire che riconciliazioni obsolete sovrascrivano lo stato recente.
- Preservare le conferme per chiusura della spesa e cancellazione dello storico.

## Strategia di test

Eseguire controlli di sintassi e verifiche proporzionate alla modifica. Il test Playwright esistente usa il frontend pubblicato con backend simulato e service worker disabilitato: non verifica Apps Script né necessariamente il checkout corrente. Gli smoke test verificano i servizi pubblicati. Per modifiche al backend, verificare le operazioni coinvolte su dati isolati, inclusi normalizzazione, duplicati e conservazione dello storico quando pertinenti.

## Definition of done

Il comportamento richiesto è verificato, i contratti tra frontend, API e fogli sono preservati e i controlli pertinenti sono superati. Dichiarare verifiche non eseguite e limiti della copertura. Quando il deploy rientra nel lavoro richiesto, verificare anche il comportamento della versione pubblicata.
