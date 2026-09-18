# PLAN-SYNC-001 — Correzione della corsa di riconciliazione

Stato: Verificato

Specifica: [`SPEC-SYNC-001`](../specifications/SPEC-SYNC-001.md).

## Passi

1. Incrementare `reconcileToken` quando il frontend entra nello stato di mutazione occupata.
2. Aggiungere un test Playwright che mantenga pendente una vecchia riconciliazione, avvii una seconda mutazione e rilasci la risposta obsoleta.
3. Verificare che la risposta obsoleta non sostituisca lo stato ottimistico recente.
4. Verificare lo stato autorevole dopo la riconciliazione successiva e la riabilitazione dei comandi.
5. Eseguire controllo sintattico, test frontend e `git diff --check`.
6. Aggiornare stato e risultati nei documenti dell'incremento e nell'AS-IS.

## Rischi

- Un incremento del token nel momento sbagliato potrebbe invalidare anche la nuova riconciliazione. Il test controlla l'intera sequenza.
- Il test asincrono potrebbe essere instabile se dipendesse da ritardi temporali. Le risposte vengono quindi sbloccate tramite eventi osservabili, non con attese arbitrarie.

## Criterio di completamento

Tutti i criteri di accettazione di `REQ-SYNC-001` sono coperti dal test e i controlli pertinenti passano. Se il browser non è disponibile, il limite deve essere dichiarato e il requisito non passa a `Verificato`.

## Esito

Implementazione completata e tre test frontend superati il 18 settembre 2026. Il test con il Google Sheet reale non era necessario perché la modifica riguarda esclusivamente l'ordinamento dello stato nel client e il backend è simulato in modo controllato.
