# PLAN-LIFE-001 — Rimozione dello stato e migrazione

Stato: Verificato.

Specifica: [`SPEC-LIFE-001`](../specifications/SPEC-LIFE-001.md).

## Passi

1. Adeguare tutte le letture e scritture di `Lista Spesa` a quattro colonne.
2. Rimuovere il filtro sul valore `Da comprare` da lettura, ricerca e chiusura.
3. Aggiungere una funzione di migrazione prudente e non esposta via HTTP.
4. Aggiungere test isolati della logica Apps Script e della migrazione.
5. Eseguire test backend simulati, test frontend, controllo sintattico e `git diff --check`.
6. Aggiornare AS-IS, tracciabilità e stato dei documenti.
7. Pubblicare il backend aggiornato prima di eseguire la migrazione sul foglio.
8. Eseguire la migrazione e verificare il servizio pubblicato e il foglio reale.

## Rischi e mitigazioni

- **Eliminazione della colonna sbagliata:** la migrazione elimina E soltanto se E1 è `Stato` dopo normalizzazione.
- **Interruzione fra deploy e migrazione:** il nuovo backend ignora E ed è compatibile con entrambi gli schemi.
- **Perdita dello storico:** la migrazione opera soltanto su `Lista Spesa`; i test di chiusura reali non cancellano lo storico.
- **Dati reali nella lista durante la prova:** la migrazione non modifica A-D. La chiusura reale viene verificata soltanto in una finestra adatta o in ambiente isolato.

## Criterio di completamento

Il requisito passa a `Verificato` quando codice e test locali sono superati, il backend aggiornato è pubblicato, la colonna `Stato` è rimossa dal foglio e una lettura pubblicata conferma che la lista continua a funzionare.

## Esito

Tutti i passi sono stati completati il 18 settembre 2026. Il deployment finale è la versione 17. Sono passati 6 test backend, 3 test frontend e il test CRUD con Google Sheet reale. La chiusura completa è stata verificata nel backend simulato e non sul foglio condiviso, per non archiviare prodotti reali.
