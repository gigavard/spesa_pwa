# PLAN-VOICE-001 — Inserimento vocale alternativo alla tastiera

Stato: Verificato.

Specifica: [`SPEC-VOICE-001`](../specifications/SPEC-VOICE-001.md).

## Passi

1. Aggiungere un pulsante microfono accessibile nella riga di inserimento.
2. Rilevare `SpeechRecognition` e `webkitSpeechRecognition`, nascondendo il comando senza supporto.
3. Configurare una sessione singola italiana e gestirne stato e ciclo di vita.
4. Sostituire la casella con il risultato finale senza invocare `aggiungi()`.
5. Gestire permesso negato, assenza di parlato, microfono indisponibile ed errori generici.
6. Integrare il pulsante con il blocco già usato durante le mutazioni.
7. Aggiungere test browser per percorso positivo, conferma manuale, errore e mancato supporto.
8. Eseguire test manifest, frontend, backend, sintassi e `git diff --check`.
9. Aggiornare AS-IS e tracciabilità.
10. Pubblicare e verificare il frontend; lasciare la prova con microfono reale come controllo Android.

## Rischi e mitigazioni

- **API sperimentale o prefissata:** feature detection di entrambe le forme e fallback manuale.
- **Permesso negato:** messaggio esplicito e nessun blocco persistente.
- **Trascrizione errata:** nessuna aggiunta automatica; testo visibile e modificabile.
- **Doppio avvio:** stato impostato prima di `start()` e pulsante disabilitato.
- **Conflitto con mutazioni:** disponibilità del microfono coordinata con `operazioneInCorso`.

## Criterio di completamento

I test automatici sono superati, la versione pubblicata conserva il flusso manuale e un test su Chrome Android conferma permesso, ascolto, trascrizione e successiva aggiunta manuale. Senza prova hardware il requisito resta `Implementato`.

## Avanzamento

Tutti i passi sono completati. Sono passati 6 test backend, 1 test manifest e 8 test frontend. Il commit `a6a549d` è pubblicato e verificato con un browser sul sito reale; il product owner ha confermato il funzionamento del microfono nell'app installata su Android.
