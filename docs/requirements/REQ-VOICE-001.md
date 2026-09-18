# REQ-VOICE-001 — Compilazione vocale del prodotto

Stato: Verificato.

## Contesto e obiettivo

L'utente deve poter compilare tramite voce la stessa casella usata per scrivere prodotti e quantità. L'inserimento manuale resta sempre disponibile. La voce prepara il testo, mentre l'aggiunta alla lista continua a richiedere il comando `Aggiungi`.

La soluzione iniziale è destinata principalmente a Chrome su Android e usa il riconoscimento vocale disponibile nel browser. La Web Speech API prevede l'avvio esplicito da parte dell'utente, risultati di trascrizione e una lingua configurabile. Chrome documenta anche l'implementazione con prefisso `webkitSpeechRecognition`.

Fonti tecniche:

- [Web Speech API specification](https://webaudio.github.io/web-speech-api/)
- [Chrome for Developers: Voice driven web apps](https://developer.chrome.com/blog/voice-driven-web-apps-introduction-to-the-web-speech-api)

## Requisiti

- `REQ-VOICE-001.1` — Dove il browser supporta il riconoscimento vocale, il sistema deve mostrare un pulsante microfono accanto alla casella del prodotto.
- `REQ-VOICE-001.2` — Quando l'utente attiva il microfono, il sistema deve avviare una sessione di riconoscimento vocale singola in italiano.
- `REQ-VOICE-001.3` — Mentre il sistema ascolta, il sistema deve rendere visibile lo stato di ascolto e impedire avvii vocali sovrapposti.
- `REQ-VOICE-001.4` — Quando il riconoscimento produce un risultato finale, il sistema deve inserirne la trascrizione nella casella del prodotto senza aggiungere automaticamente il prodotto alla lista.
- `REQ-VOICE-001.5` — Dopo una trascrizione, il sistema deve permettere all'utente di correggere il testo e aggiungerlo con il comando manuale `Aggiungi`.
- `REQ-VOICE-001.6` — Se il browser non supporta il riconoscimento vocale, il sistema non deve mostrare un comando inutilizzabile e deve preservare integralmente l'inserimento manuale.
- `REQ-VOICE-001.7` — Se il permesso viene negato, non viene riconosciuto alcun parlato o si verifica un errore, il sistema deve terminare lo stato di ascolto, mostrare un messaggio comprensibile e lasciare utilizzabile l'inserimento manuale.
- `REQ-VOICE-001.8` — Quando la sessione vocale termina, il sistema deve ripristinare il pulsante microfono e mantenere utilizzabile la casella di testo.
- `REQ-VOICE-001.9` — Quando la trascrizione contiene una quantità seguita da un prodotto, per esempio `4 banane`, il sistema deve usare il parsing manuale esistente al successivo comando `Aggiungi`.
- `REQ-VOICE-001.10` — Se la casella contiene già del testo quando arriva una trascrizione finale, il sistema deve sostituire interamente il contenuto precedente con la nuova trascrizione.

## Criteri di accettazione

1. In un browser supportato il pulsante microfono è visibile; in un browser non supportato è nascosto.
2. Un tocco avvia una sola sessione con lingua `it-IT`, modalità non continua e soli risultati finali.
3. Durante l'ascolto il pulsante comunica lo stato e non avvia una seconda sessione.
4. La trascrizione viene mostrata nella casella e può essere modificata.
5. La trascrizione non invia alcun POST e non modifica la lista finché l'utente non preme `Aggiungi`.
6. `4 banane`, dopo la conferma manuale, usa lo stesso risultato dell'inserimento da tastiera: prodotto `Banane`, quantità 4.
7. Negazione del permesso, assenza di parlato ed errori ripristinano un'interfaccia utilizzabile.
8. Il caricamento e le normali operazioni della lista restano funzionanti senza supporto vocale.

## Fuori ambito

- aggiunta automatica dopo la trascrizione;
- ascolto continuo;
- comandi vocali per incrementare, eliminare o chiudere la spesa;
- interpretazione AI del linguaggio naturale;
- supporto garantito su browser diversi da quelli che espongono `SpeechRecognition` o `webkitSpeechRecognition`.

## Dipendenze

- sito pubblicato in HTTPS;
- consenso esplicito dell'utente all'accesso al microfono;
- servizio di riconoscimento messo a disposizione dal browser;
- parser testuale esistente, invariato.

## Domande aperte

Nessuna.

`Q-VOICE-001` è stata risolta il 18 settembre 2026: la trascrizione sostituisce il contenuto precedente.

## Tracciabilità

| Artefatto | Collegamento |
|---|---|
| Specifica | [`SPEC-VOICE-001`](../specifications/SPEC-VOICE-001.md) |
| Piano | [`PLAN-VOICE-001`](../plans/PLAN-VOICE-001.md) |
| Test browser | `tests/frontend.spec.js`, casi marcati `REQ-VOICE-001` |

## Esito corrente

Il 18 settembre 2026 sono passati tre scenari vocali automatici: trascrizione e conferma manuale, permesso negato e browser non supportato. Nella stessa esecuzione sono passati tutti gli 8 test frontend, oltre a 6 test backend e 1 test manifest. La funzione è stata pubblicata con il commit `a6a549d`; un controllo browser sul sito pubblico ha confermato pulsante visibile con API disponibile, lingua `it-IT`, sostituzione del testo e messaggio di conferma.

Il product owner ha successivamente confermato il corretto funzionamento nell'app installata su Android. La prova reale completa la verifica di microfono, permesso e servizio di riconoscimento; il requisito passa quindi a `Verificato`.
