# Test browser

```sh
npm ci
npx playwright install --with-deps chromium
npm run test:backend
npm run test:frontend
npm run test:e2e
```

`npm test` esegue i test Apps Script e i due progetti Playwright. Il server di test serve il checkout locale:
non dipende dalla pubblicazione di GitHub Pages. Non modificare il codice
applicativo prima di aver eseguito i test che devono riprodurre il problema.

- `backend`: esegue Apps Script in un contesto Node isolato e verifica schema a
  quattro colonne, duplicati, chiusura completa e migrazione della vecchia
  colonna `Stato`.
- `manifest`: verifica nome, modalità standalone, riferimenti locali e dimensioni
  reali delle icone ordinarie e maskable.
- `frontend`: regressione rapida con backend simulato e service worker bloccato.
- `sheet`: browser Chromium con service worker attivo e backend reale indicato
  dal frontend. Verifica aggiunta, incremento, decremento ed eliminazione nella
  stessa pagina, lo stato dopo la riconciliazione JSONP, una lettura indipendente
  del Google Sheet tramite Apps Script e l'utilizzabilità dei comandi.

Il progetto `sheet` scrive nel foglio reale. Usa un prodotto con UUID, non chiude
la spesa e non cancella lo storico. Un `finally` rimuove solo quel prodotto e
verifica la pulizia anche dopo un fallimento. Un'interruzione forzata del processo
o un'indisponibilità del backend possono impedire la pulizia: il nome è riportato
nell'allegato `sheet-evidence` dei risultati per consentire una rimozione mirata.
Non interrompere un'esecuzione durante le scritture; attendere la pulizia.

Le evidenze JSON, gli screenshot e le trace dei fallimenti sono in `test-results/`.
Il test controlla i dati restituiti dal backend reale, che legge il foglio; non
usa le API Google Sheets direttamente. Il backend pubblicato viene verificato,
mentre eventuali modifiche locali ad Apps Script richiedono un deploy per essere
esercitate da questi test.

La CI esegue automaticamente il progetto simulato. Il progetto con Sheet reale
si abilita manualmente tramite l'input `real_sheet`; le esecuzioni CI non vengono
annullate per consentire la pulizia dei dati.
