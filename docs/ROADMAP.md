# Roadmap proposta

Questa roadmap parte dall'AS-IS e ordina il lavoro in modo da migliorare prima l'uso quotidiano, poi aggiungere capacità intelligenti.

## 1. Rendere affidabile la baseline

Prima delle nuove funzioni conviene chiudere i rischi che incidono sui dati condivisi:

- invalidare ogni riconciliazione in corso all'inizio di una nuova mutazione — completato e verificato in `REQ-SYNC-001`;
- rendere sicura o rimuovere dall'API pubblica la cancellazione completa dello storico;
- semplificare `Lista Spesa` rimuovendo lo stato ridondante e archiviare ogni prodotto alla chiusura — completato e verificato in `REQ-LIFE-001` e `ADR-002`;
- aggiungere test per inserimento, quantità nel testo, duplicati normalizzati, chiusura e fallimenti di rete;
- mantenere documentato il rischio dell'accesso tramite URL senza autenticazione — decisione registrata in `ADR-001`;

Criterio di completamento: i flussi principali sono coperti, nessuna lettura obsoleta può sovrascrivere una modifica più recente e le operazioni distruttive non sono richiamabili accidentalmente fuori dalla UI.

## 2. Installazione Android

Il manifest e il service worker esistono già. Per completare il percorso:

- aggiungere al repository icone 192×192, 512×512 e una variante `maskable`;
- verificare manifest, MIME type, scope, service worker e icone sul dominio GitHub Pages pubblicato;
- provare installazione, avvio standalone e aggiornamento su entrambi i telefoni Android;
- valutare un piccolo aiuto contestuale per l'installazione, senza renderlo necessario all'uso;
- definire una strategia di aggiornamento del service worker, anche se resta network-only.

Pulsante, manifest e icone locali sono implementati e pubblicati in `REQ-PWA-001`; resta la prova su un dispositivo Android reale.

Criterio di completamento: entrambi gli utenti possono installare l'app dalla versione pubblicata, avviarla dalla home e ricevere una versione aggiornata dopo un nuovo deploy.

## 3. Inserimento vocale

L'input vocale dovrebbe alimentare lo stesso campo e lo stesso parser dell'inserimento manuale. Un primo incremento semplice può usare il riconoscimento vocale disponibile in Chrome Android:

- aggiungere un pulsante microfono accessibile accanto al campo;
- richiedere il permesso soltanto dopo il tocco dell'utente;
- impostare la lingua su italiano;
- mostrare chiaramente gli stati ascolto, risultato ed errore;
- inserire la trascrizione nel campo, lasciandola modificabile prima dell'invio;
- riusare il parser corrente per comandi come `4 banane`;
- mantenere sempre disponibile la tastiera quando l'API vocale non è supportata o il permesso è negato.

Il riconoscimento non deve aggiungere automaticamente elementi ambigui. La trascrizione visibile offre una conferma naturale prima di premere “Aggiungi”.

Criterio di completamento: su entrambi i telefoni, “4 banane” produce una trascrizione modificabile e aggiunge `Banane` con quantità 4; errori e mancato supporto non bloccano l'inserimento manuale.

Pulsante, trascrizione sostitutiva e conferma manuale sono implementati, pubblicati e verificati su Android in `REQ-VOICE-001`.

## 4. Preparare i dati per i suggerimenti

Prima dell'agente serve un accesso controllato allo storico. Il minimo utile è un endpoint di sola lettura che restituisca righe storiche o, preferibilmente, aggregati necessari al caso d'uso.

Occorre inoltre decidere:

- se ogni chiusura debba avere un identificativo di sessione;
- se conservare data e ora invece della sola data;
- se autore e categorie servano davvero ai suggerimenti;
- per quanto tempo conservare i dati;
- come testare gli algoritmi con un dataset isolato e privo di dati personali reali.

Qualunque estensione del foglio richiede una migrazione che mantenga compatibili le colonne e le intestazioni esistenti.

## 5. Suggerimenti basati sulle spese passate

La prima versione può essere deterministica e spiegabile, senza un modello linguistico:

- frequenza di acquisto per prodotto normalizzato;
- giorni medi dall'ultimo acquisto;
- prodotti acquistati spesso insieme;
- esclusione di ciò che è già nella lista;
- punteggio e breve motivazione per ogni suggerimento.

L'interfaccia mostra una proposta separata dalla lista effettiva. L'utente seleziona o conferma gli elementi prima che vengano aggiunti con le normali API CRUD.

Solo dopo aver validato utilità e qualità dei dati ha senso introdurre un agente. L'agente dovrebbe leggere lista e statistiche, formulare una proposta e chiamare le mutazioni soltanto dopo conferma esplicita.

Criterio di completamento: “Prepara la spesa” genera suggerimenti ripetibili e motivati, non duplica prodotti presenti e non modifica il foglio senza conferma.

## Ordine consigliato immediato

Il prossimo incremento consigliato è la baseline di affidabilità, seguito dal completamento dell'installazione Android. L'input vocale è poi un'aggiunta circoscritta e verificabile. L'agente viene dopo l'endpoint storico e dopo aver raccolto abbastanza spese reali da valutare la qualità dei suggerimenti.
