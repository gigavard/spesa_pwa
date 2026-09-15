const NOME_LISTA = 'Lista Spesa';
const NOME_STORICO = 'Storico';


/*
 * WEB APP / API
 */
function doGet(e) {

  const action = e && e.parameter
    ? e.parameter.action
    : '';

  // Se apro normalmente l'URL Apps Script,
  // continuo a mostrare la vecchia interfaccia.
  if (!action) {
    return HtmlService
      .createHtmlOutputFromFile('Index')
      .setTitle('Spesa');
  }

  try {

    switch (action) {

      case 'lista':
        return jsonResponse({
          ok: true,
          lista: getListaSpesa()
        });

      default:
        return jsonResponse({
          ok: false,
          messaggio: 'Azione non riconosciuta.'
        });
    }

  } catch (error) {

    return jsonResponse({
      ok: false,
      messaggio: error.message
    });
  }
}


function doPost(e) {

  try {

    const dati = JSON.parse(
      e.postData.contents || '{}'
    );

    const action = dati.action;

    let risposta;

    switch (action) {

      case 'aggiungi':
        risposta = aggiungiProdotto(
          dati.testo,
          dati.utente
        );
        break;

      case 'aumenta':
        aumentaQuantita(
          Number(dati.riga)
        );

        risposta = {
          ok: true
        };
        break;

      case 'diminuisci':
        diminuisciQuantita(
          Number(dati.riga)
        );

        risposta = {
          ok: true
        };
        break;

      case 'rimuovi':
        rimuoviProdotto(
          Number(dati.riga)
        );

        risposta = {
          ok: true
        };
        break;

      case 'chiudi':
        risposta = chiudiSpesa();
        break;

      case 'pulisciStorico':
        pulisciStorico();

        risposta = {
          ok: true
        };
        break;

      default:
        risposta = {
          ok: false,
          messaggio: 'Azione non riconosciuta.'
        };
    }

    return jsonResponse(risposta);

  } catch (error) {

    return jsonResponse({
      ok: false,
      messaggio: error.message
    });
  }
}


function jsonResponse(dati) {

  return ContentService
    .createTextOutput(
      JSON.stringify(dati)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


/*
 * LISTA SPESA
 */
function getListaSpesa() {

  const sheet = getFoglio();

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const valori =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        5
      )
      .getValues();

  const lista = [];

  for (let i = 0; i < valori.length; i++) {

    const prodotto = valori[i][0];

    const quantita =
      Number(valori[i][1]) || 1;

    const stato = valori[i][4];

    if (
      prodotto &&
      stato === 'Da comprare'
    ) {

      lista.push({
        riga: i + 2,
        prodotto: prodotto,
        quantita: quantita
      });
    }
  }

  return lista;
}


function aggiungiProdotto(testo, aggiuntoDa) {

  const sheet = getFoglio();

  const input =
    String(testo || '').trim();

  if (!input) {

    return {
      ok: false,
      messaggio: 'Scrivi un prodotto.'
    };
  }

  const parsed =
    parseInput(input);

  const lastRow =
    sheet.getLastRow();

  const valori =
    lastRow >= 2
      ? sheet
          .getRange(
            2,
            1,
            lastRow - 1,
            5
          )
          .getValues()
      : [];

  const target =
    normalizza(parsed.prodotto);

  for (let i = 0; i < valori.length; i++) {

    const prodotto =
      valori[i][0];

    const quantita =
      Number(valori[i][1]) || 1;

    const stato =
      valori[i][4];

    if (
      normalizza(prodotto) === target &&
      stato === 'Da comprare'
    ) {

      return {
        ok: false,
        esistente: true,
        prodotto: prodotto,
        quantita: quantita,
        messaggio:
          `${prodotto} è già presente in quantità ${quantita}.`
      };
    }
  }

  const oggi =
    Utilities.formatDate(
      new Date(),
      'Europe/Rome',
      'dd/MM/yyyy'
    );

  sheet.appendRow([
    parsed.prodotto,
    parsed.quantita,
    oggi,
    aggiuntoDa || '',
    'Da comprare'
  ]);

  return {
    ok: true,
    messaggio:
      `${parsed.prodotto} aggiunto, quantità ${parsed.quantita}.`
  };
}


function aumentaQuantita(riga) {

  const sheet = getFoglio();

  const cella =
    sheet.getRange(riga, 2);

  const quantita =
    Number(cella.getValue()) || 1;

  cella.setValue(
    quantita + 1
  );

  return true;
}


function diminuisciQuantita(riga) {

  const sheet = getFoglio();

  const cella =
    sheet.getRange(riga, 2);

  const quantita =
    Number(cella.getValue()) || 1;

  if (quantita > 1) {

    cella.setValue(
      quantita - 1
    );

  } else {

    sheet.deleteRow(riga);
  }

  return true;
}


function rimuoviProdotto(riga) {

  const sheet = getFoglio();

  sheet.deleteRow(riga);

  return true;
}


/*
 * CHIUSURA SPESA
 */
function chiudiSpesa() {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const lista =
    ss.getSheetByName(
      NOME_LISTA
    );

  const storico =
    ss.getSheetByName(
      NOME_STORICO
    );

  if (!lista || !storico) {

    throw new Error(
      'Foglio Lista Spesa o Storico non trovato'
    );
  }

  const lastRow =
    lista.getLastRow();

  if (lastRow < 2) {

    return {
      ok: false,
      messaggio:
        'La lista è già vuota.'
    };
  }

  const valori =
    lista
      .getRange(
        2,
        1,
        lastRow - 1,
        5
      )
      .getValues();

  const oggi =
    Utilities.formatDate(
      new Date(),
      'Europe/Rome',
      'dd/MM/yyyy'
    );

  const righeStorico = [];

  valori.forEach(function(riga) {

    const prodotto =
      riga[0];

    const quantita =
      Number(riga[1]) || 1;

    if (prodotto) {

      righeStorico.push([
        prodotto,
        quantita,
        oggi
      ]);
    }
  });

  if (righeStorico.length > 0) {

    storico
      .getRange(
        storico.getLastRow() + 1,
        1,
        righeStorico.length,
        3
      )
      .setValues(
        righeStorico
      );
  }

  /*
   * Svuotiamo i contenuti senza
   * distruggere righe/formattazioni.
   */
  lista
    .getRange(
      2,
      1,
      lastRow - 1,
      5
    )
    .clearContent();

  return {
    ok: true,
    messaggio:
      `Spesa chiusa: ${righeStorico.length} prodotti salvati nello storico.`
  };
}


/*
 * STORICO
 */
function pulisciStorico() {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const storico =
    ss.getSheetByName(
      NOME_STORICO
    );

  if (!storico) {

    throw new Error(
      'Foglio Storico non trovato'
    );
  }

  const lastRow =
    storico.getLastRow();

  if (lastRow >= 2) {

    storico
      .getRange(
        2,
        1,
        lastRow - 1,
        3
      )
      .clearContent();
  }

  return true;
}


/*
 * UTILITÀ
 */
function getFoglio() {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(
      NOME_LISTA
    );

  if (!sheet) {

    throw new Error(
      'Foglio "Lista Spesa" non trovato'
    );
  }

  return sheet;
}


function parseInput(input) {

  let testo =
    input.trim();

  let quantita = 1;

  let prodotto =
    testo;

  const match =
    testo.match(
      /^(\d+)\s+(.+)$/
    );

  if (match) {

    quantita =
      parseInt(
        match[1],
        10
      );

    prodotto =
      match[2];
  }

  prodotto =
    prodotto
      .trim()
      .replace(/\s+/g, ' ');

  prodotto =
    prodotto
      .charAt(0)
      .toUpperCase() +
    prodotto.slice(1);

  return {
    prodotto,
    quantita
  };
}


function normalizza(testo) {

  return String(
    testo || ''
  )
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    );
}
