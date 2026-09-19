const NOME_LISTA = 'Lista Spesa';
const NOME_STORICO = 'Storico';
const NOME_CATALOGO = 'Catalogo prodotti';
const TEST_SPREADSHEET_ID = '1uW9phsPDSAuMz2mEOCJVQy5rtBPTdUbD7qH6cx-NejQ';
const CATEGORIE = [
  'Frutta e verdura', 'Banco frigo', 'Colazione', 'Scatole e barattoli',
  'Bevande', 'Bagno e igiene', 'Casa', 'Salumi', 'Pane', 'Surgelati', 'Altro'
];

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
        risposta = { ok: true, lista: getListaSpesa(isTestMode(p.testMode)) };
        break;
      case 'ambiente':
        {
          const testMode = isTestMode(p.testMode);
          getSpreadsheet(testMode);
          risposta = {
            ok: true,
            testMode: testMode,
            spreadsheet: testMode ? 'ListaSpesaTest' : 'ListaSpesa'
          };
        }
        break;
      case 'categorie':
        risposta = { ok: true, categorie: CATEGORIE };
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
    const testMode = isTestMode(dati.testMode);
    let risposta;

    switch (action) {
      case 'aggiungi':
        risposta = aggiungiProdotto(dati.testo, dati.utente, testMode);
        break;
      case 'importa':
        risposta = importaProdotti(dati.testo, dati.utente, testMode);
        break;
      case 'aumenta':
        aumentaQuantitaProdotto(dati.prodotto, testMode);
        risposta = { ok: true };
        break;
      case 'diminuisci':
        diminuisciQuantitaProdotto(dati.prodotto, testMode);
        risposta = { ok: true };
        break;
      case 'rimuovi':
        rimuoviProdotto(dati.prodotto, testMode);
        risposta = { ok: true };
        break;
      case 'chiudi':
        risposta = chiudiSpesa(testMode);
        break;
      case 'pulisciStorico':
        pulisciStorico(testMode);
        risposta = { ok: true };
        break;
      case 'categoria':
        risposta = assegnaCategoria(dati.prodotto, dati.categoria, testMode);
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

function getListaSpesa(testMode) {
  const sheet = getFoglio(testMode);
  const catalogo = leggiCatalogo(testMode);
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
        quantita: quantita,
        categoria: categoriaPerProdotto(prodotto, catalogo)
      });
    }
  }

  return lista;
}

function aggiungiProdotto(testo, aggiuntoDa, testMode) {
  return conLock(function() {
    const sheet = getFoglio(testMode);
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

function importaProdotti(testo, aggiuntoDa, testMode) {
  return conLock(function() {
    const elementi = raggruppaImportazione(parseTestoImportazione(testo));
    if (elementi.length === 0) {
      return { ok: false, messaggio: 'Incolla almeno un prodotto.' };
    }

    const sheet = getFoglio(testMode);
    const oggi = Utilities.formatDate(new Date(), 'Europe/Rome', 'dd/MM/yyyy');
    const nuoveRighe = [];
    let aggiornati = 0;
    let giaPresenti = 0;

    elementi.forEach(function(elemento) {
      const esistente = trovaProdotto(sheet, elemento.prodotto);
      if (!esistente) {
        nuoveRighe.push([elemento.prodotto, elemento.quantita, oggi, aggiuntoDa || '']);
        return;
      }

      giaPresenti++;
      if (elemento.quantita > esistente.quantita) {
        sheet.getRange(esistente.riga, 2).setValue(elemento.quantita);
        aggiornati++;
      }
    });

    if (nuoveRighe.length > 0) {
      sheet
        .getRange(sheet.getLastRow() + 1, 1, nuoveRighe.length, 4)
        .setValues(nuoveRighe);
    }

    if (nuoveRighe.length > 0 || aggiornati > 0) SpreadsheetApp.flush();

    return {
      ok: true,
      aggiunti: nuoveRighe.length,
      aggiornati: aggiornati,
      giaPresenti: giaPresenti,
      messaggio: creaMessaggioImportazione(nuoveRighe.length, aggiornati, giaPresenti)
    };
  });
}

function creaMessaggioImportazione(aggiunti, aggiornati, giaPresenti) {
  return aggiunti + ' aggiunti, ' + aggiornati + ' aggiornati, ' +
    giaPresenti + ' già presenti.';
}

function aumentaQuantitaProdotto(prodotto, testMode) {
  return conLock(function() {
    const sheet = getFoglio(testMode);
    const item = trovaProdottoObbligatorio(sheet, prodotto);
    sheet.getRange(item.riga, 2).setValue(item.quantita + 1);
    SpreadsheetApp.flush();
    return true;
  });
}

function diminuisciQuantitaProdotto(prodotto, testMode) {
  return conLock(function() {
    const sheet = getFoglio(testMode);
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

function rimuoviProdotto(prodotto, testMode) {
  return conLock(function() {
    const sheet = getFoglio(testMode);
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
  const simili = [];
  for (let i = 0; i < valori.length; i++) {
    const prodotto = valori[i][0];
    if (prodotto && nomiProdottiSimili(prodotto, prodottoCercato)) {
      simili.push({
        riga: i + 2,
        prodotto: String(prodotto),
        quantita: Number(valori[i][1]) || 1
      });
    }
  }
  return simili.length === 1 ? simili[0] : null;
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

function chiudiSpesa(testMode) {
  return conLock(function() {
    const ss = getSpreadsheet(testMode);
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

function pulisciStorico(testMode) {
  return conLock(function() {
    const ss = getSpreadsheet(testMode);
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

function assegnaCategoria(prodotto, categoria, testMode) {
  return conLock(function() {
    const categoriaValida = CATEGORIE.indexOf(String(categoria || '').trim()) >= 0
      ? String(categoria).trim()
      : null;
    if (!categoriaValida) throw new Error('Categoria non valida.');

    const catalogo = getCatalogoFoglio(testMode);
    const target = normalizza(prodotto);
    if (!target) throw new Error('Prodotto non valido.');
    const dati = leggiRigheCatalogo(catalogo);
    const voce = trovaVoceCatalogo(dati, prodotto);

    if (!voce) catalogo.appendRow([String(prodotto).trim(), categoriaValida, '']);
    else catalogo.getRange(voce.riga, 2).setValue(categoriaValida);
    SpreadsheetApp.flush();
    return { ok: true, prodotto: String(prodotto).trim(), categoria: categoriaValida };
  });
}

function getFoglio(testMode) {
  const ss = getSpreadsheet(testMode);
  const sheet = ss.getSheetByName(NOME_LISTA);
  if (!sheet) throw new Error('Foglio "Lista Spesa" non trovato');
  return sheet;
}

function getCatalogoFoglio(testMode) {
  const ss = getSpreadsheet(testMode);
  let sheet = ss.getSheetByName(NOME_CATALOGO);
  if (!sheet) {
    sheet = ss.insertSheet(NOME_CATALOGO);
    sheet.getRange(1, 1, 1, 3).setValues([['Prodotto', 'Categoria', 'Varianti']]);
    SpreadsheetApp.flush();
  }
  return sheet;
}

function leggiRigheCatalogo(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 3).getValues()
    .map(function(riga, indice) {
      return {
        riga: indice + 2,
        prodotto: String(riga[0] || '').trim(),
        categoria: CATEGORIE.indexOf(String(riga[1] || '').trim()) >= 0
          ? String(riga[1]).trim() : 'Altro',
        varianti: String(riga[2] || '').split(';').map(function(item) {
          return item.trim();
        }).filter(Boolean)
      };
    }).filter(function(voce) { return voce.prodotto; });
}

function leggiCatalogo(testMode) {
  return leggiRigheCatalogo(getCatalogoFoglio(testMode));
}

function categoriaPerProdotto(prodotto, catalogo) {
  const voce = trovaVoceCatalogo(catalogo, prodotto);
  return voce ? voce.categoria : 'Altro';
}

function trovaVoceCatalogo(catalogo, prodotto) {
  const target = normalizza(prodotto);
  if (!target) return null;
  for (let i = 0; i < catalogo.length; i++) {
    const voce = catalogo[i];
    if (normalizza(voce.prodotto) === target || voce.varianti.some(function(variante) {
      return normalizza(variante) === target;
    })) return voce;
  }
  const simili = catalogo.filter(function(voce) {
    return [voce.prodotto].concat(voce.varianti).some(function(nome) {
      return nomiProdottiSimili(nome, prodotto);
    });
  });
  return simili.length === 1 ? simili[0] : null;
}

function getSpreadsheet(testMode) {
  return testMode
    ? SpreadsheetApp.openById(TEST_SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function isTestMode(value) {
  return value === true || String(value || '').toLowerCase() === 'true';
}

function migraRimuoviColonnaStato(testMode) {
  return conLock(function() {
    const sheet = getFoglio(testMode);
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

function parseTestoImportazione(testo) {
  return String(testo || '')
    .split(/\r?\n/)
    .map(parseRigaImportazione)
    .filter(function(elemento) { return elemento !== null; });
}

function parseRigaImportazione(riga) {
  const testo = String(riga || '').trim().replace(/\s+/g, ' ');
  if (!testo) return null;

  const parti = testo.split(' ');
  let quantita = parseQuantitaItaliana(parti[0]);
  let indiceQuantita = quantita !== null && parti.length > 1 ? 0 : -1;

  if (indiceQuantita < 0) {
    quantita = parseQuantitaItaliana(parti[parti.length - 1]);
    indiceQuantita = quantita !== null && parti.length > 1 ? parti.length - 1 : -1;
  }

  if (indiceQuantita < 0) quantita = 1;
  else parti.splice(indiceQuantita, 1);

  let prodotto = parti.join(' ').trim().replace(/\s+/g, ' ');
  prodotto = prodotto.charAt(0).toUpperCase() + prodotto.slice(1);
  return { prodotto: prodotto, quantita: quantita };
}

function parseQuantitaItaliana(valore) {
  const token = normalizza(valore).replace(/[-'’]/g, '');
  if (/^\d+$/.test(token)) {
    const numero = parseInt(token, 10);
    return numero > 0 ? numero : null;
  }

  const unita = {
    un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5,
    sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11,
    dodici: 12, tredici: 13, quattordici: 14, quindici: 15,
    sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19
  };
  if (Object.prototype.hasOwnProperty.call(unita, token)) return unita[token];

  const decine = {
    venti: 20, trenta: 30, quaranta: 40, cinquanta: 50,
    sessanta: 60, settanta: 70, ottanta: 80, novanta: 90
  };
  if (Object.prototype.hasOwnProperty.call(decine, token)) return decine[token];

  const cifre = { uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9 };
  const nomiDecine = Object.keys(decine);
  for (let i = 0; i < nomiDecine.length; i++) {
    const nomeDecina = nomiDecine[i];
    const valoreDecina = decine[nomeDecina];
    const nomiCifre = Object.keys(cifre);
    for (let j = 0; j < nomiCifre.length; j++) {
      const nomeCifra = nomiCifre[j];
      const radice = nomeCifra === 'uno' || nomeCifra === 'otto'
        ? nomeDecina.slice(0, -1)
        : nomeDecina;
      if (token === radice + nomeCifra) return valoreDecina + cifre[nomeCifra];
    }
  }
  return null;
}

function raggruppaImportazione(elementi) {
  const gruppi = [];
  const perChiave = Object.create(null);

  elementi.forEach(function(elemento) {
    const chiave = normalizza(elemento.prodotto);
    if (!chiave) return;
    const gruppoSimile = gruppi.find(function(gruppo) {
      return nomiProdottiSimili(gruppo.prodotto, elemento.prodotto);
    });
    const chiaveGruppo = gruppoSimile ? gruppoSimile.chiave : chiave;
    if (!perChiave[chiaveGruppo]) {
      perChiave[chiaveGruppo] = {
        chiave: chiaveGruppo,
        prodotto: elemento.prodotto,
        quantita: elemento.quantita
      };
      gruppi.push(perChiave[chiaveGruppo]);
      return;
    }
    perChiave[chiaveGruppo].quantita = Math.max(perChiave[chiaveGruppo].quantita, elemento.quantita);
  });

  return gruppi;
}

function normalizza(testo) {
  return String(testo || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function nomiProdottiSimili(primo, secondo) {
  const a = normalizza(primo);
  const b = normalizza(secondo);
  if (a.length < 5 || b.length < 5) return false;
  if (a === b) return true;
  if (a.slice(0, 3) !== b.slice(0, 3)) return false;
  return distanzaLevenshtein(a, b) <= 1;
}

function distanzaLevenshtein(a, b) {
  const riga = Array.from({ length: b.length + 1 }, function(_, i) { return i; });
  for (let i = 1; i <= a.length; i++) {
    let diagonale = riga[0];
    riga[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const sopra = riga[j];
      riga[j] = a[i - 1] === b[j - 1]
        ? diagonale
        : Math.min(diagonale + 1, sopra + 1, riga[j - 1] + 1);
      diagonale = sopra;
    }
  }
  return riga[b.length];
}
