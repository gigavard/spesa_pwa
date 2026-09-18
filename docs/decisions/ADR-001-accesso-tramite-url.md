# ADR-001 — Accesso tramite URL senza autenticazione

Stato: Accettata.
Data: 2026-09-18.

## Contesto

Il frontend è pubblicato su GitHub Pages e il backend Apps Script è configurato con accesso anonimo. La scelta locale fra Giulio e Alice attribuisce gli inserimenti, ma non autentica l'utente.

È stato valutato se limitare lista e storico ai due utilizzatori oppure mantenerli accessibili tramite conoscenza dell'URL.

## Decisione

Lista e storico restano accessibili a chiunque conosca l'URL. Non viene introdotta autenticazione in questa fase.

## Alternative considerate

- autenticazione dei due utilizzatori;
- protezione aggiuntiva delle sole mutazioni;
- ambiente pubblico tramite URL, soluzione scelta.

## Conseguenze

- l'uso resta semplice e non richiede login;
- il nome selezionato nel browser rimane un'attribuzione dichiarata e non un'identità verificata;
- chi ottiene l'URL del backend può leggere la lista e inviare mutazioni direttamente;
- l'URL non deve essere descritto come controllo di sicurezza;
- eventuali future funzioni che espongono maggiori informazioni, in particolare lo storico, richiederanno una nuova valutazione esplicita della decisione.

## Collegamenti

- [AS-IS](../AS-IS.md)
- [Politica di test](../TESTING.md)
