# PLAN-PWA-001 — Pulsante installazione e icone Android

Stato: Implementato.

Specifica: [`SPEC-PWA-001`](../specifications/SPEC-PWA-001.md).

## Passi

1. Generare un'icona sorgente quadrata con carrello, adatta anche alla zona sicura maskable.
2. Salvare nel repository le varianti PNG 192×192 e 512×512 per uso ordinario e maskable.
3. Sostituire nel manifest le icone CDN con gli asset locali e dichiararne il purpose.
4. Aggiungere il pulsante di installazione, inizialmente nascosto e coerente con l'interfaccia mobile.
5. Gestire `beforeinstallprompt`, scelta dell'utente, `appinstalled` e modalità standalone.
6. Aggiungere test browser per disponibilità, consumo del prompt e assenza di supporto.
7. Validare sintassi, manifest, dimensioni delle icone, test frontend e `git diff --check`.
8. Pubblicare il frontend e verificare gli asset sul dominio GitHub Pages.
9. Registrare la prova Android o dichiararla come verifica manuale pendente.
10. Aggiornare AS-IS e tracciabilità.

## Rischi e mitigazioni

- **Prompt controllato dal browser:** il pulsante appare soltanto dopo l'evento reale; non viene promesso che Chrome lo emetta in ogni momento.
- **Icona tagliata dal launcher:** il carrello resta nella zona sicura e viene fornita una variante maskable.
- **Dipendenza esterna dell'icona:** tutti gli asset usati dal manifest sono locali al progetto.
- **Aspettativa offline:** interfaccia e documentazione non descrivono l'app come utilizzabile senza rete.

## Criterio di completamento

Test automatici e controlli degli asset passano, la versione pubblicata serve manifest e icone locali e una prova Android conferma nome `Spesa`, carrello e apertura standalone. Se la prova sul dispositivo non è disponibile, il requisito resta `Implementato` e non passa a `Verificato`.

## Avanzamento

Passi 1-7 completati il 18 settembre 2026. Sono passati 1 test manifest e 5 test frontend. Restano pubblicazione, verifica HTTP e prova manuale Android.
