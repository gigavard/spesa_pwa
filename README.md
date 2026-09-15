# Spesa PWA

Una semplice applicazione condivisa per la gestione della lista della spesa.

Il progetto ha però soprattutto uno scopo didattico: è un laboratorio per imparare a sviluppare software con strumenti e agenti AI, sperimentando un workflow reale che comprende repository Git, coding agent, test automatici, CI/CD e deploy.

## Obiettivi

L'obiettivo funzionale è volutamente semplice:

- Giulio e Alice condividono la stessa lista della spesa.
- Gli elementi possono essere aggiunti, incrementati, decrementati o eliminati.
- La lista corrente rappresenta ciò che rimane da comprare.
- Al termine della spesa, gli elementi vengono salvati nello storico e la lista viene svuotata.
- Lo storico potrà essere utilizzato in futuro per suggerire prodotti ricorrenti o dimenticati.

Le normali operazioni CRUD devono rimanere deterministiche. L'AI non deve essere necessaria per aggiungere o rimuovere un prodotto.

## Scopo didattico

Il progetto serve soprattutto per sperimentare un workflow di sviluppo AI-assisted.

In particolare:

- capire quando usare ChatGPT e quando usare un coding agent;
- imparare a delegare task a Codex;
- scrivere prompt efficaci per agenti di sviluppo;
- ridurre il contesto e il consumo di token;
- mantenere nel repository il contesto stabile del progetto;
- definire criteri di accettazione verificabili;
- distinguere smoke test, integration test ed end-to-end test;
- automatizzare test e deploy;
- mantenere l'intervento umano sulle attività dove porta realmente valore.

## Architettura

### Frontend

PWA statica in HTML, CSS e JavaScript.

Hosting:

- GitHub Pages

La PWA è pensata principalmente per Android.

### Backend

Google Apps Script.

Espone le operazioni necessarie per leggere e modificare la lista.

### Persistenza

Google Sheet con due fogli principali:

- `Lista Spesa`
- `Storico`

La lista corrente è stato operativo temporaneo.

Lo storico contiene invece le spese completate.

### Comunicazione frontend/backend

Il frontend comunica con Google Apps Script.

Le letture utilizzano JSONP.

Le scritture utilizzano richieste POST.

Dopo una modifica il frontend deve riconciliare il proprio stato con quello persistito nel backend.

## Repository

Il repository contiene:

- frontend PWA;
- codice Google Apps Script;
- configurazione del deploy;
- GitHub Actions;
- test automatici;
- istruzioni per gli agenti AI in `AGENTS.md`.

## Deploy

Il frontend viene pubblicato tramite GitHub Pages.

Il backend Google Apps Script viene distribuito automaticamente tramite GitHub Actions e `clasp`.

Il repository Git è la source of truth del codice.

## Test

Il progetto utilizza diversi livelli di verifica.

### Smoke test

Controllano che i componenti principali siano raggiungibili, ad esempio:

- frontend pubblicato;
- endpoint Apps Script disponibile.

Gli smoke test non sono sufficienti per dichiarare funzionante una feature UI.

### End-to-end test

Playwright viene utilizzato per verificare i comportamenti reali nel browser.

Per le modifiche al frontend, quando possibile, il test deve riprodurre l'interazione dell'utente:

1. apertura dell'app;
2. interazione con i controlli;
3. modifica dello stato;
4. aggiornamento della UI;
5. ritorno dell'interfaccia a uno stato utilizzabile.

Un task frontend non deve essere considerato concluso solamente perché backend e API rispondono correttamente.

## Principi di sviluppo

- Preferire soluzioni semplici.
- Non introdurre AI dove basta codice deterministico.
- Automatizzare le verifiche ripetibili.
- Evitare test distruttivi sul Google Sheet di produzione.
- Usare test browser per i comportamenti visibili all'utente.
- Conservare nel repository il contesto stabile del progetto.
- Usare le conversazioni AI principalmente per il contesto del task corrente.
- Non dichiarare concluso un task se i relativi test falliscono.

## Workflow AI

La divisione prevista è:

**ChatGPT**

Architettura, ragionamento, progettazione, analisi del workflow, spiegazione e scelta degli strumenti.

**Codex**

Implementazione operativa, esplorazione del repository, modifica del codice, esecuzione dei test e debugging.

**GitHub**

Source control e source of truth.

**GitHub Actions**

Continuous Integration e automazione del deploy.

**Playwright**

Verifica end-to-end del comportamento dell'app nel browser.

## Evoluzione futura

Una volta stabilizzata la gestione deterministica della lista, sarà possibile sperimentare una funzione AI del tipo:

> Preparami la spesa.

L'agente potrà analizzare lista corrente e storico per suggerire prodotti ricorrenti, associazioni e possibili dimenticanze.

Le modifiche alla lista dovranno comunque essere confermate dall'utente.

## Stato del progetto

Il progetto è sperimentale.

La priorità non è costruire il miglior software possibile per gestire una lista della spesa, ma utilizzare un dominio semplice per imparare e valutare workflow moderni di sviluppo assistito da AI.
