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
  catalogoRows = [['Prodotto', 'Categoria', 'Varianti', 'Ordine']],
  testListaRows = [['Prodotto', 'Quantità', 'Data', 'Autore']],
  testStoricoRows = [['Prodotto', 'Quantità', 'Data']]
}) {
  const lista = new FakeSheet(listaRows);
  const storico = new FakeSheet(storicoRows);
  const catalogo = new FakeSheet(catalogoRows);
  const testLista = new FakeSheet(testListaRows);
  const testStorico = new FakeSheet(testStoricoRows);
  let flushes = 0;
  let lockWaits = 0;
  let lockReleases = 0;
  const spreadsheet = {
    getSheetByName(name) {
      if (name === 'Lista Spesa') return lista;
      if (name === 'Storico') return storico;
      if (name === 'Catalogo prodotti') return catalogo;
      return null;
    },
    insertSheet(name) {
      assert.equal(name, 'Catalogo prodotti');
      return catalogo;
    }
  };
  const testSpreadsheet = {
    getSheetByName(name) {
      if (name === 'Lista Spesa') return testLista;
      if (name === 'Storico') return testStorico;
      if (name === 'Catalogo prodotti') return null;
      return null;
    },
    insertSheet(name) {
      assert.equal(name, 'Catalogo prodotti');
      return new FakeSheet([['Prodotto', 'Categoria', 'Varianti']]);
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
    catalogo,
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
    [{ prodotto: 'Prodotto test', quantita: 2, categoria: 'Altro' }]
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

test('categories are persisted separately and reused through variants', () => {
  const app = loadAppsScript({
    listaRows: [
      ['Prodotto', 'Quantità', 'Data', 'Autore'],
      ['Banana', 1, '18/09/2026', 'Alice']
    ],
    catalogoRows: [
      ['Prodotto', 'Categoria', 'Varianti'],
      ['Banana', 'Frutta e verdura', 'banane; banan']
    ]
  });

  assert.deepEqual(Array.from(app.getFunction('getListaSpesa')(), item => ({ ...item })), [
    { prodotto: 'Banana', quantita: 1, categoria: 'Frutta e verdura' }
  ]);
  const result = app.getFunction('assegnaCategoria')('Banana', 'Colazione', false);
  assert.deepEqual({ ...result }, { ok: true, prodotto: 'Banana', categoria: 'Colazione' });
  assert.equal(app.catalogo.rows[1][1], 'Colazione');
});

test('similar product names are merged only for a unique long candidate', () => {
  const app = loadAppsScript({
    listaRows: [
      ['Prodotto', 'Quantità', 'Data', 'Autore'],
      ['Banana', 1, '18/09/2026', 'Alice']
    ]
  });
  const duplicate = app.getFunction('aggiungiProdotto')('banane', 'Giulio');
  assert.equal(duplicate.esistente, true);
  assert.equal(duplicate.prodotto, 'Banana');
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
      { prodotto: 'Latte', quantita: 2, categoria: 'Altro' },
      { prodotto: 'Pane', quantita: 1, categoria: 'Altro' }
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

test('catalog parser recognizes leading words, digits and suffix x', () => {
  const app = loadAppsScript({ listaRows: [['Prodotto', 'Quantità', 'Data', 'Autore']] });
  const parse = app.getFunction('parseInput');
  for (const [input, prodotto, quantita] of [['due latte', 'Latte', 2], ['2 latte', 'Latte', 2], ['latte x 2', 'Latte', 2], ['dieci mele', 'Mele', 10]]) {
    const actual = parse(input); assert.equal(actual.prodotto, prodotto); assert.equal(actual.quantita, quantita);
  }
});

test('catalog canonical product and category are reused for similar names', () => {
  const app = loadAppsScript({ catalogoRows: [
    ['Prodotto', 'Categoria', 'Varianti', 'Ordine'],
    ['Banane', 'Frutta e verdura', '', 1]
  ], listaRows: [['Prodotto', 'Quantità', 'Data', 'Autore']] });
  const result = app.getFunction('aggiungiProdotto')('banana', 'Giulio');
  assert.equal(result.ok, true);
  assert.equal(result.prodotto, 'Banane');
  assert.deepEqual(app.lista.rows[1], ['Banane', 1, '18/09/2026', 'Giulio']);
});

test('catalog reorder swaps configured order', () => {
  const app = loadAppsScript({ catalogoRows: [
    ['Prodotto', 'Categoria', 'Varianti', 'Ordine'],
    ['Latte', 'Colazione', '', 1],
    ['Biscotti', 'Colazione', '', 2]
  ], listaRows: [['Prodotto', 'Quantità', 'Data', 'Autore']] });
  app.getFunction('riordinaCatalogo')('Biscotti', 'su', false);
  const catalogo = app.getFunction('leggiCatalogo')(false);
  assert.equal(catalogo.find(x => x.prodotto === 'Biscotti').ordine, 1);
  assert.equal(catalogo.find(x => x.prodotto === 'Latte').ordine, 2);
});

test('REQ-IMPORT-001: bulk import keeps existing metadata and blocks duplicates', () => {
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

  assert.equal(result.ok, true);
  assert.equal(result.aggiunti, 2);
  assert.equal(result.aggiornati, 0);
  assert.equal(result.giaPresenti, 2);
  assert.equal(Array.from(result.duplicati).join(','), 'Banane,Latte');
  assert.equal(result.messaggio, '2 aggiunti, 2 già presenti. Non inseriti: Banane, Latte.');
  assert.deepEqual(app.lista.rows, [
    ['Prodotto', 'Quantità', 'Data', 'Autore'],
    ['Banane', 4, '17/09/2026', 'Giulio'],
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
