const NOME_LISTA = 'Lista Spesa';
const NOME_STORICO = 'Storico';

function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  const action = p.action || '';

  if (!action) {
    return apiResponse({ ok: true, service: 'Spesa API' });
  }

  try {
    let risposta;

    switch (action) {
      case 'lista':
        risposta = { ok: true, lista: getListaSpesa() };
        break;
      default:
        risposta = { ok: false, messaggio: 'Azione GET non riconosciuta.' };
    }

    return apiResponse(risposta, p.callback);
  } catch (error) {
    return apiResponse({ ok: false, messaggio: error.message }, p.callback);
  }
}

function doPost(e) {
  try {
    const dati = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = dati.action;
    let risposta;

    switch (action) {
      case 'aggiungi':
        risposta = aggiungiProdotto(dati.testo, dati.utente);
        break;
      case 'aumenta':
        aumentaQuantitaProdotto(dati.prodotto);
        risposta = { ok: true };
        break;
      case 'diminuisci':
        diminuisciQuantitaProdotto(dati.prodotto);
        risposta = { ok: true };
        break;
      case 'rimuovi':
        rimuoviProdotto(dati.prodotto);
        risposta = { ok: true };
        break;
      case 'chiudi':
        risposta = chiudiSpesa();
        break;
      case 'pulisciStorico':
        pulisciStorico();
        risposta = { ok: true };
        break;
      default:
        risposta = { ok: false, messaggio: 'Azione POST non riconosciuta.' };
    }

    return apiResponse(risposta);
  } catch (error) {
    return apiResponse({ ok: false, messaggio: error.message });
  }
}

function apiResponse(dati, callback) {
  const json = JSON.stringify(dati);

  if (callback) {
    if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
      return ContentService
        .createTextOutput('/* callback non valida */')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function getListaSpesa() {
  const sheet = getFoglio();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const valori = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  const lista = [];

  for (let i = 0; i < valori.length; i++) {
    const prodotto = valori[i][0];
    const quantita = Number(valori[i][1]) || 1;
    if (prodotto) {
      lista.push({
        prodotto: String(prodotto),
        quantita: quantita
      });
    }
  }

  return lista;
}

function aggiungiProdotto(testo, aggiuntoDa) {
  return conLock(function() {
    const sheet = getFoglio();
    const input = String(testo || '').trim();

    if (!input) {
      return { ok: false, messaggio: 'Scrivi un prodotto.' };
    }

    const parsed = parseInput(input);
    const esistente = trovaProdotto(sheet, parsed.prodotto);

    if (esistente) {
      return {
        ok: false,
        esistente: true,
        prodotto: esistente.prodotto,
        quantita: esistente.quantita,
        messaggio: `${esistente.prodotto} è già presente in quantità ${esistente.quantita}.`
      };
    }

    const oggi = Utilities.formatDate(new Date(), 'Europe/Rome', 'dd/MM/yyyy');
    sheet.appendRow([
      parsed.prodotto,
      parsed.quantita,
      oggi,
      aggiuntoDa || ''
    ]);

    return {
      ok: true,
      prodotto: parsed.prodotto,
      quantita: parsed.quantita,
      messaggio: `${parsed.prodotto} aggiunto, quantità ${parsed.quantita}.`
    };
  });
}

function aumentaQuantitaProdotto(prodotto) {
  return conLock(function() {
    const sheet = getFoglio();
    const item = trovaProdottoObbligatorio(sheet, prodotto);
    sheet.getRange(item.riga, 2).setValue(item.quantita + 1);
    SpreadsheetApp.flush();
    return true;
  });
}

function diminuisciQuantitaProdotto(prodotto) {
  return conLock(function() {
    const sheet = getFoglio();
    const item = trovaProdottoObbligatorio(sheet, prodotto);

    if (item.quantita > 1) {
      sheet.getRange(item.riga, 2).setValue(item.quantita - 1);
    } else {
      sheet.deleteRow(item.riga);
    }

    SpreadsheetApp.flush();
    return true;
  });
}

function rimuoviProdotto(prodotto) {
  return conLock(function() {
    const sheet = getFoglio();
    const item = trovaProdottoObbligatorio(sheet, prodotto);
    sheet.deleteRow(item.riga);
    SpreadsheetApp.flush();
    return true;
  });
}

function trovaProdotto(sheet, prodottoCercato) {
  const target = normalizza(prodottoCercato);
  if (!target) return null;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const valori = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

  for (let i = 0; i < valori.length; i++) {
    const prodotto = valori[i][0];
    if (prodotto && normalizza(prodotto) === target) {
      return {
        riga: i + 2,
        prodotto: String(prodotto),
        quantita: Number(valori[i][1]) || 1
      };
    }
  }

  return null;
}

function trovaProdottoObbligatorio(sheet, prodotto) {
  const item = trovaProdotto(sheet, prodotto);
  if (!item) {
    throw new Error(`Prodotto non trovato: ${prodotto || ''}`);
  }
  return item;
}

function conLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function chiudiSpesa() {
  return conLock(function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const lista = ss.getSheetByName(NOME_LISTA);
    const storico = ss.getSheetByName(NOME_STORICO);

    if (!lista || !storico) {
      throw new Error('Foglio Lista Spesa o Storico non trovato');
    }

    const lastRow = lista.getLastRow();
    if (lastRow < 2) {
      return { ok: false, messaggio: 'La lista è già vuota.' };
    }

    const valori = lista.getRange(2, 1, lastRow - 1, 4).getValues();
    const oggi = Utilities.formatDate(new Date(), 'Europe/Rome', 'dd/MM/yyyy');
    const righeStorico = [];

    valori.forEach(function(riga) {
      const prodotto = riga[0];
      const quantita = Number(riga[1]) || 1;
      if (prodotto) {
        righeStorico.push([prodotto, quantita, oggi]);
      }
    });

    if (righeStorico.length > 0) {
      storico
        .getRange(storico.getLastRow() + 1, 1, righeStorico.length, 3)
        .setValues(righeStorico);
    }

    lista.getRange(2, 1, lastRow - 1, 4).clearContent();
    SpreadsheetApp.flush();

    return {
      ok: true,
      messaggio: `Spesa chiusa: ${righeStorico.length} prodotti salvati nello storico.`
    };
  });
}

function pulisciStorico() {
  return conLock(function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const storico = ss.getSheetByName(NOME_STORICO);

    if (!storico) throw new Error('Foglio Storico non trovato');

    const lastRow = storico.getLastRow();
    if (lastRow >= 2) {
      storico.getRange(2, 1, lastRow - 1, 3).clearContent();
      SpreadsheetApp.flush();
    }
    return true;
  });
}

function getFoglio() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(NOME_LISTA);
  if (!sheet) throw new Error('Foglio "Lista Spesa" non trovato');
  return sheet;
}

function migraRimuoviColonnaStato() {
  return conLock(function() {
    const sheet = getFoglio();
    const intestazione = String(sheet.getRange(1, 5).getValue() || '').trim();

    if (!intestazione) {
      return {
        ok: true,
        migrato: false,
        messaggio: 'La colonna Stato risulta già assente.'
      };
    }

    if (normalizza(intestazione) !== 'stato') {
      throw new Error(`Migrazione interrotta: intestazione E1 inattesa (${intestazione}).`);
    }

    sheet.deleteColumn(5);
    SpreadsheetApp.flush();
    return {
      ok: true,
      migrato: true,
      messaggio: 'Colonna Stato rimossa da Lista Spesa.'
    };
  });
}

function parseInput(input) {
  const testo = input.trim();
  let quantita = 1;
  let prodotto = testo;
  const match = testo.match(/^(\d+)\s+(.+)$/);

  if (match) {
    quantita = parseInt(match[1], 10);
    prodotto = match[2];
  }

  prodotto = prodotto.trim().replace(/\s+/g, ' ');
  prodotto = prodotto.charAt(0).toUpperCase() + prodotto.slice(1);

  return { prodotto, quantita };
}

function normalizza(testo) {
  return String(testo || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
