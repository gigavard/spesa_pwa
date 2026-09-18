# PLAN-IMPORT-001 — Importazione con anteprima e deduplicazione

Stato: Implementato.

Specifica: [`SPEC-IMPORT-001`](../specifications/SPEC-IMPORT-001.md).

## Passi

1. Implementare e testare il parser italiano 1-99 nel backend.
2. Aggiungere l'azione bulk `importa` con deduplicazione e quantità massima sotto un solo lock.
3. Estendere i mock Apps Script e i test backend per parsing, aggiornamenti e scrittura bulk.
4. Portare lo stesso parser nel client mantenendo identiche normalizzazione e precedenze.
5. Aggiungere pannello, textarea, analisi, anteprima, riepilogo, annullamento e conferma.
6. Applicare ottimisticamente nuovi prodotti e quantità massime, poi riconciliare.
7. Aggiungere test browser per esempio, duplicati, nessun POST in analisi e conferma bulk.
8. Eseguire test sintattici, backend, manifest, frontend e `git diff --check`.
9. Aggiornare AS-IS e tracciabilità.
10. Pubblicare backend e frontend.
11. Eseguire test isolato sul Google Sheet reale con pulizia mirata.
12. Verificare il flusso pubblicato su Android.

## Rischi e mitigazioni

- **Divergenza client/server:** stessi casi tabellari eseguiti contro entrambi i parser.
- **POST opaco:** aggiornamento ottimistico seguito da rilettura autorevole.
- **Importazione parziale per concorrenza:** singola azione backend protetta da lock.
- **Perdita di metadati:** i duplicati modificano soltanto la cella quantità.
- **Anteprima non più coerente col testo:** ogni modifica invalida la conferma.
- **Dati reali nei test:** prefisso univoco e rimozione esclusiva delle righe create dal test.

## Criterio di completamento

Tutti i criteri di `REQ-IMPORT-001` sono coperti; test locali e reali passano; backend e frontend sono pubblicati; una prova Android conferma incolla, anteprima e importazione. In assenza della prova Android il requisito resta `Implementato`.

## Esito

I passi 1-11 sono completati. Il backend è pubblicato come versione 19, i test isolati e browser passano e la prova sul Google Sheet reale ha verificato quantità massime e pulizia mirata. Resta il passo 12, la prova manuale del flusso nell'app installata su Android.
