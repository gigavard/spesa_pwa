# SPEC-VOICE-001 — Compilazione vocale one-shot

Stato: Implementato.

Requisito coperto: [`REQ-VOICE-001`](../requirements/REQ-VOICE-001.md).

## Interfaccia

Un pulsante microfono viene inserito nella stessa riga della casella prodotto e del pulsante `Aggiungi`. È inizialmente nascosto e viene mostrato soltanto quando esiste `window.SpeechRecognition` oppure `window.webkitSpeechRecognition`.

Il pulsante ha un'etichetta accessibile esplicita. Durante avvio e ascolto cambia stato visivo, comunica `Ascolto...` nello spazio messaggi ed è disabilitato per impedire sessioni sovrapposte.

## Configurazione del riconoscimento

Viene creata una singola istanza del costruttore disponibile, con:

- `lang = 'it-IT'`;
- `continuous = false`;
- `interimResults = false`;
- `maxAlternatives = 1`.

`start()` viene chiamato soltanto dall'evento di tocco del pulsante, rispettando il requisito di consenso e attivazione esplicita della Web Speech API.

## Gestione del risultato

Il client considera il primo risultato finale disponibile, applica `trim()` alla trascrizione e sostituisce interamente il valore della casella. Non chiama `aggiungi()` e non invia richieste al backend.

Dopo la trascrizione:

- il testo rimane modificabile;
- il focus torna alla casella;
- un messaggio invita a controllare il testo e premere `Aggiungi`;
- il normale parser client e server interpreta quantità e prodotto quando l'utente conferma.

## Stato ed errori

Una variabile booleana distingue sessione libera e sessione avviata. Lo stato viene impostato prima di chiamare `start()`, così due tocchi ravvicinati non creano sessioni concorrenti. `onend` ripristina sempre il pulsante.

Gli errori vengono tradotti in messaggi sintetici:

- `not-allowed` o `service-not-allowed`: permesso microfono non disponibile;
- `no-speech`: nessun parlato riconosciuto;
- `audio-capture`: microfono non disponibile;
- altri errori: riconoscimento non riuscito.

Un errore sincrono di `start()` percorre lo stesso ripristino. Nessun errore disabilita input manuale o pulsante `Aggiungi`.

Durante una mutazione della lista, il microfono segue il blocco generale dei comandi. Al termine torna disponibile se il browser lo supporta e non è in corso una sessione vocale.

## Componenti interessati

- `index.html`: pulsante, stile, feature detection e gestione del riconoscimento;
- `tests/frontend.spec.js`: browser supportato simulato, risultato, errore e browser non supportato;
- documentazione AS-IS e tracciabilità.

Backend, contratto API, parser, fogli e service worker non cambiano.

## Strategia di test

Il costruttore browser viene sostituito nei test con un fake controllabile. I test verificano:

1. configurazione italiana one-shot;
2. pulsante visibile soltanto con supporto;
3. stato di ascolto e blocco dei doppi avvii;
4. sostituzione di un valore precedente con `4 banane`;
5. assenza di POST prima della conferma manuale;
6. aggiunta finale di `Banane` con quantità 4 usando il flusso esistente;
7. ripristino dopo permesso negato;
8. inserimento manuale disponibile in assenza dell'API.

La prova del microfono reale resta manuale su Android, perché i test browser simulano il motore e non accedono a hardware o servizi vocali.

## Esito corrente

Pulsante, feature detection, riconoscimento one-shot, sostituzione del testo e gestione degli errori sono implementati. Tre test vocali e tutte le regressioni automatiche sono superati. Restano pubblicazione e prova su microfono Android reale.
