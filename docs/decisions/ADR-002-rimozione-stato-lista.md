# ADR-002 — Rimozione dello stato dalla lista corrente

Stato: Accettata.
Data: 2026-09-18.

## Contesto

Il foglio `Lista Spesa` contiene una quinta colonna `Stato` e il backend considera soltanto le righe con valore esatto `Da comprare`. Il prodotto prevede ora un solo ciclo di vita: ciò che è nella lista è da comprare; quando la spesa viene chiusa, tutto viene trasferito nello storico ed è considerato comprato.

Non viene gestito il caso di prodotti non trovati o mantenuti nella lista dopo la chiusura.

## Decisione

La colonna `Stato` viene rimossa dal modello dati e fisicamente dal foglio `Lista Spesa`. Il foglio passa da cinque a quattro colonne applicative: prodotto, quantità, data e autore.

Il backend identifica gli elementi attivi per la loro presenza in `Lista Spesa`, senza filtrare un valore di stato. Il foglio `Storico` mantiene le tre colonne esistenti: prodotto, quantità e data della spesa.

## Alternative considerate

- mantenere la colonna e continuare a valorizzarla;
- conservare la colonna per compatibilità ma ignorarla;
- rimuovere colonna e logica associata, soluzione scelta.

## Conseguenze

- il modello rappresenta direttamente il ciclo di vita effettivo;
- non può verificarsi una divergenza causata da uno stato vuoto o scritto diversamente;
- backend, documentazione e test devono usare quattro colonne per la lista;
- il foglio esistente richiede una migrazione controllata;
- una futura gestione dei prodotti non trovati richiederà nuovi requisiti e un nuovo modello, senza riutilizzare implicitamente la colonna rimossa.

## Collegamenti

- [`REQ-LIFE-001`](../requirements/REQ-LIFE-001.md)
- [`SPEC-LIFE-001`](../specifications/SPEC-LIFE-001.md)
