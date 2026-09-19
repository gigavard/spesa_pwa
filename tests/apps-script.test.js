const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'code.gs'), 'utf8');

class FakeRange {
  constructor(sheet, row, column, numRows = 1, numColumns = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    return Array.from({ length: this.numRows }, (_, rowOffset) =>
      Array.from({ length: this.numColumns }, (_, columnOffset) =>
        this.sheet.valueAt(this.row + rowOffset, this.column + columnOffset)));
  }

  getValue() {
    return this.sheet.valueAt(this.row, this.column);
  }

  setValue(value) {
    this.sheet.setValueAt(this.row, this.column, value);
    return this;
  }

  setValues(values) {
    for (let rowOffset = 0; rowOffset < this.numRows; rowOffset++) {
      for (let columnOffset = 0; columnOffset < this.numColumns; columnOffset++) {
        this.sheet.setValueAt(
          this.row + rowOffset,
          this.column + columnOffset,
          values[rowOffset][columnOffset]
        );
      }
    }
    return this;
  }

  clearContent() {
    this.setValues(Array.from({ length: this.numRows }, () => Array(this.numColumns).fill('')));
    this.sheet.clearedRanges.push({
      row: this.row,
      column: this.column,
      numRows: this.numRows,
      numColumns: this.numColumns
    });
    return this;
  }
}

class FakeSheet {
  constructor(rows) {
    this.rows = rows.map(row => row.slice());
    this.appendedRows = [];
    this.clearedRanges = [];
    this.deletedColumns = [];
  }

  valueAt(row, column) {
    return (this.rows[row - 1] || [])[column - 1] ?? '';
  }

  setValueAt(row, column, value) {
    while (this.rows.length < row) this.rows.push([]);
    while (this.rows[row - 1].length < column) this.rows[row - 1].push('');
    this.rows[row - 1][column - 1] = value;
  }

  getLastRow() {
    for (let index = this.rows.length - 1; index >= 0; index--) {
      if (this.rows[index].some(value => value !== '' && value !== null)) return index + 1;
    }
    return 0;
  }

  getRange(row, column, numRows, numColumns) {
    return new FakeRange(this, row, column, numRows, numColumns);
  }

  appendRow(values) {
    const row = Array.from(values);
    this.rows.push(row.slice());
    this.appendedRows.push(row);
  }

  deleteRow(row) {
    this.rows.splice(row - 1, 1);
  }

  deleteColumn(column) {
    this.rows.forEach(row => row.splice(column - 1, 1));
    this.deletedColumns.push(column);
  }
}

function loadAppsScript({
  listaRows,
  storicoRows = [['Prodotto', 'Quantità', 'Data']],
  testListaRows = [['Prodotto', 'Quantità', 'Data', 'Autore']],
  testStoricoRows = [['Prodotto', 'Quantità', 'Data']]
}) {
  const lista = new FakeSheet(listaRows);
  const storico = new FakeSheet(storicoRows);
  const testLista = new FakeSheet(testListaRows);
  const testStorico = new FakeSheet(testStoricoRows);
  let flushes = 0;
  let lockWaits = 0;
  let lockReleases = 0;
  const spreadsheet = {
    getSheetByName(name) {
      if (name === 'Lista Spesa') return lista;
      if (name === 'Storico') return storico;
      return null;
    }
  };
  const testSpreadsheet = {
    getSheetByName(name) {
      if (name === 'Lista Spesa') return testLista;
      if (name === 'Storico') return testStorico;
      return null;
    }
  };
  const context = vm.createContext({
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      openById: id => {
        assert.equal(id, '1uW9phsPDSAuMz2mEOCJVQy5rtBPTdUbD7qH6cx-NejQ');
        return testSpreadsheet;
      },
      flush: () => { flushes++; }
    },
    Utilities: {
      formatDate: () => '18/09/2026'
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: milliseconds => {
          assert.equal(milliseconds, 10000);
          lockWaits++;
        },
        releaseLock: () => { lockReleases++; }
      })
    }
  });
  vm.runInContext(source, context, { filename: 'apps-script/code.gs' });

  function getFunction(name) {
    return vm.runInContext(name, context);
  }

  return {
    lista,
    storico,
    testLista,
    testStorico,
    getFunction,
    metrics: () => ({ flushes, lockWaits, lockReleases })
  };
}

test('TEST_MODE routes reads and writes only to ListaSpesaTest', () => {
  const app = loadAppsScript({
    listaRows: [
      ['Prodotto', 'Quantità', 'Data', 'Autore'],
      ['Prodotto reale', 1, '18/09/2026', 'Giulio']
    ],
    testListaRows: [
      ['Prodotto', 'Quantità', 'Data', 'Autore'],
      ['Prodotto test', 2, '18/09/2026', 'Alice']
    ]
  });

  assert.deepEqual(
    Array.from(app.getFunction('getListaSpesa')(true), item => ({ ...item })),
    [{ prodotto: 'Prodotto test', quantita: 2 }]
  );
  const result = app.getFunction('aggiungiProdotto')('3 banane', 'Alice', true);
  assert.equal(result.ok, true);
  assert.deepEqual(app.testLista.appendedRows, [['Banane', 3, '18/09/2026', 'Alice']]);
  assert.deepEqual(app.lista.rows, [
    ['Prodotto', 'Quantità', 'Data', 'Autore'],
    ['Prodotto reale', 1, '18/09/2026', 'Giulio']
  ]);
});

test('TEST_MODE accepts only the boolean true or the string true', () => {
  const app = loadAppsScript({ listaRows: [['Prodotto', 'Quantità', 'Data', 'Autore']] });
  const isTestMode = app.getFunction('isTestMode');
  assert.equal(isTestMode(true), true);
  assert.equal(isTestMode('true'), true);
  assert.equal(isTestMode(false), false);
  assert.equal(isTestMode('false'), false);
  assert.equal(isTestMode('1'), false);
});

test('REQ-LIFE-001: list reads and duplicate lookup do not depend on legacy state', () => {
  const app = loadAppsScript({
    listaRows: [
      ['Prodotto', 'Quantità', 'Data', 'Autore', 'Stato'],
      ['Latte', 2, '17/09/2026', 'Giulio', ''],
      ['Pane', 1, '17/09/2026', 'Alice', 'Valore precedente']
    ]
  });

  assert.deepEqual(
    Array.from(app.getFunction('getListaSpesa')(), item => ({ ...item })),
    [
      { prodotto: 'Latte', quantita: 2 },
      { prodotto: 'Pane', quantita: 1 }
    ]
  );

  const duplicate = app.getFunction('aggiungiProdotto')('  latte ', 'Alice');
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.esistente, true);
  assert.equal(app.lista.appendedRows.length, 0);
});

test('REQ-LIFE-001: adding a product writes the four-column schema', () => {
  const app = loadAppsScript({
    listaRows: [['Prodotto', 'Quantità', 'Data', 'Autore']]
  });

  const result = app.getFunction('aggiungiProdotto')('3 banane', 'Alice');

  assert.equal(result.ok, true);
  assert.deepEqual(app.lista.appendedRows, [['Banane', 3, '18/09/2026', 'Alice']]);
  assert.deepEqual(app.metrics(), { flushes: 0, lockWaits: 1, lockReleases: 1 });
});

test('REQ-IMPORT-001: import parser recognizes quantities at either end from one to ninety-nine', () => {
  const app = loadAppsScript({
    listaRows: [['Prodotto', 'Quantità', 'Data', 'Autore']]
  });
  const parse = app.getFunction('parseTestoImportazione');

  const parsed = Array.from(parse([
    '2 banane morbide',
    'detersivo per piatti',
    'scottex',
    'fagioli scatola tre',
    'una mela',
    'ventuno uova',
    'yogurt ventitré',
    'caramelle novantanove',
    'due banane',
    'banane due'
  ].join('\n')), item => ({ ...item }));

  assert.deepEqual(parsed, [
    { prodotto: 'Banane morbide', quantita: 2 },
    { prodotto: 'Detersivo per piatti', quantita: 1 },
    { prodotto: 'Scottex', quantita: 1 },
    { prodotto: 'Fagioli scatola', quantita: 3 },
    { prodotto: 'Mela', quantita: 1 },
    { prodotto: 'Uova', quantita: 21 },
    { prodotto: 'Yogurt', quantita: 23 },
    { prodotto: 'Caramelle', quantita: 99 },
    { prodotto: 'Banane', quantita: 2 },
    { prodotto: 'Banane', quantita: 2 }
  ]);
});

test('REQ-IMPORT-001: bulk import keeps existing metadata and applies maximum duplicate quantity', () => {
  const app = loadAppsScript({
    listaRows: [
      ['Prodotto', 'Quantità', 'Data', 'Autore'],
      ['Banane', 4, '17/09/2026', 'Giulio'],
      ['Latte', 2, '16/09/2026', 'Alice']
    ]
  });

  const result = app.getFunction('importaProdotti')([
    '2 banane',
    'due banane',
    'banane cinque',
    'latte uno',
    'mele tre',
    'cinque mele',
    'scottex'
  ].join('\n'), 'Alice');

  assert.deepEqual({ ...result }, {
    ok: true,
    aggiunti: 2,
    aggiornati: 1,
    giaPresenti: 2,
    messaggio: '2 aggiunti, 1 aggiornati, 2 già presenti.'
  });
  assert.deepEqual(app.lista.rows, [
    ['Prodotto', 'Quantità', 'Data', 'Autore'],
    ['Banane', 5, '17/09/2026', 'Giulio'],
    ['Latte', 2, '16/09/2026', 'Alice'],
    ['Mele', 5, '18/09/2026', 'Alice'],
    ['Scottex', 1, '18/09/2026', 'Alice']
  ]);
  assert.deepEqual(app.metrics(), { flushes: 1, lockWaits: 1, lockReleases: 1 });
});

test('REQ-LIFE-001: closing archives every product and clears four list columns', () => {
  const app = loadAppsScript({
    listaRows: [
      ['Prodotto', 'Quantità', 'Data', 'Autore', 'Stato'],
      ['Latte', 2, '17/09/2026', 'Giulio', ''],
      ['Pane', 1, '17/09/2026', 'Alice', 'Valore precedente']
    ]
  });

  const result = app.getFunction('chiudiSpesa')();

  assert.equal(result.ok, true);
  assert.match(result.messaggio, /2 prodotti/);
  assert.deepEqual(app.storico.rows, [
    ['Prodotto', 'Quantità', 'Data'],
    ['Latte', 2, '18/09/2026'],
    ['Pane', 1, '18/09/2026']
  ]);
  assert.deepEqual(app.lista.clearedRanges, [
    { row: 2, column: 1, numRows: 2, numColumns: 4 }
  ]);
  assert.deepEqual(app.lista.rows.slice(1).map(row => row.slice(0, 4)), [
    ['', '', '', ''],
    ['', '', '', '']
  ]);
  assert.deepEqual(app.metrics(), { flushes: 1, lockWaits: 1, lockReleases: 1 });
});

test('ADR-002: migration removes only a recognized Stato column', () => {
  const app = loadAppsScript({
    listaRows: [
      ['Prodotto', 'Quantità', 'Data', 'Autore', 'Stato'],
      ['Latte', 1, '18/09/2026', 'Giulio', 'Da comprare']
    ]
  });

  const result = app.getFunction('migraRimuoviColonnaStato')();

  assert.deepEqual({ ...result }, {
    ok: true,
    migrato: true,
    messaggio: 'Colonna Stato rimossa da Lista Spesa.'
  });
  assert.deepEqual(app.lista.deletedColumns, [5]);
  assert.deepEqual(app.lista.rows, [
    ['Prodotto', 'Quantità', 'Data', 'Autore'],
    ['Latte', 1, '18/09/2026', 'Giulio']
  ]);
});

test('ADR-002: migration is a no-op when E1 is empty', () => {
  const app = loadAppsScript({
    listaRows: [['Prodotto', 'Quantità', 'Data', 'Autore']]
  });

  const result = app.getFunction('migraRimuoviColonnaStato')();

  assert.equal(result.ok, true);
  assert.equal(result.migrato, false);
  assert.deepEqual(app.lista.deletedColumns, []);
});

test('ADR-002: migration rejects an unexpected fifth-column header', () => {
  const app = loadAppsScript({
    listaRows: [['Prodotto', 'Quantità', 'Data', 'Autore', 'Prezzo']]
  });

  assert.throws(
    () => app.getFunction('migraRimuoviColonnaStato')(),
    /intestazione E1 inattesa \(Prezzo\)/
  );
  assert.deepEqual(app.lista.deletedColumns, []);
  assert.deepEqual(app.metrics(), { flushes: 0, lockWaits: 1, lockReleases: 1 });
});
