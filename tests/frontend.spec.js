const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

test('ORDINI, ACQUISTI and ADMIN keep their responsibilities separate', async ({ page }) => {
  const lista = [
    { prodotto: 'Latte', quantita: 2 },
    { prodotto: 'Pane', quantita: 1 }
  ];
  const posts = [];
  await page.route('https://script.google.com/**', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      const callback = new URL(request.url()).searchParams.get('callback');
      return route.fulfill({
        contentType: 'application/javascript',
        body: `${callback}(${JSON.stringify({ ok: true, lista })});`
      });
    }
    const data = JSON.parse(request.postData() || '{}');
    posts.push(data);
    return route.fulfill({ status: 200, body: '' });
  });

  await page.goto('/');
  await expect(page.locator('#titoloSchermata')).toHaveText('🛒 Ordini');
  await expect(page.locator('#btnChiudi')).toBeHidden();
  await page.locator('#btnAcquisti').click();

  await expect(page.locator('#titoloSchermata')).toHaveText('🛍️ Acquisti');
  await expect(page.locator('#listaAcquisti .riga-prodotto')).toHaveCount(2);
  await expect(page.locator('#listaAcquisti .quantita')).toHaveText(['2', '1']);
  await expect(page.locator('#listaAcquisti .azione')).toHaveCount(0);
  await expect(page.locator('#btnChiudi')).toBeVisible();

  const dialogs = [];
  page.on('dialog', async dialog => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });
  const rows = page.locator('#listaAcquisti .riga-prodotto');
  await rows.nth(0).getByRole('button', { name: 'Preso' }).click();
  await expect(rows.nth(0)).toHaveClass(/preso/);
  expect(dialogs).toEqual([]);
  await rows.nth(1).getByRole('button', { name: 'Preso' }).click();
  await expect(rows.nth(1)).toHaveClass(/preso/);
  await expect.poll(() => dialogs).toEqual(['Spesa completata']);
  expect(posts).toEqual([]);
  await page.locator('#btnChiudi').click();
  await expect.poll(() => posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ action: 'chiudi', testMode: false });
  expect(dialogs[1]).toContain('Confermi che la spesa è fatta?');

  await page.getByRole('button', { name: 'Ordini' }).click();
  await page.locator('#btnAdmin').click();
  await expect(page.locator('#titoloSchermata')).toHaveText('⚙️ Admin');
  await expect(page.locator('#testMode')).toBeVisible();
  await expect(page.locator('#linkGoogleSheet')).toHaveText('Apri ListaSpesa');
});

test('ADMIN TEST_MODE switches every backend request and the Sheet link', async ({ page }) => {
  const reads = [];
  const posts = [];
  await page.route('https://script.google.com/**', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      const url = new URL(request.url());
      const mode = url.searchParams.get('testMode');
      reads.push(mode);
      const callback = url.searchParams.get('callback');
      if (url.searchParams.get('action') === 'ambiente') {
        return route.fulfill({
          contentType: 'application/javascript',
          body: `${callback}(${JSON.stringify({ ok: true, testMode: true, spreadsheet: 'ListaSpesaTest' })});`
        });
      }
      const lista = mode === 'true' ? [{ prodotto: 'Solo test', quantita: 1 }] : [];
      return route.fulfill({
        contentType: 'application/javascript',
        body: `${callback}(${JSON.stringify({ ok: true, lista })});`
      });
    }
    posts.push(JSON.parse(request.postData() || '{}'));
    return route.fulfill({ status: 200, body: '' });
  });

  await page.goto('/');
  await page.locator('#btnAdmin').click();
  await page.locator('#testMode').check();
  await expect(page.locator('#linkGoogleSheet')).toHaveText('Apri ListaSpesaTest');
  await expect(page.locator('#linkGoogleSheet')).toHaveAttribute('href', /1uW9phsPDSAuMz2mEOCJVQy5rtBPTdUbD7qH6cx-NejQ/);
  await page.getByRole('button', { name: 'Ordini' }).click();
  await expect(page.locator('#lista .nome-prodotto')).toHaveText('Solo test');
  await page.getByRole('button', { name: 'Alice', exact: true }).click();
  await page.locator('#prodotto').fill('Mele');
  await page.locator('#btnAggiungi').click();
  await expect.poll(() => posts.length).toBeGreaterThan(0);
  expect(posts[0].testMode).toBe(true);
  expect(reads).toContain('false');
  expect(reads).toContain('true');
});

test('TEST_MODE fails closed when the backend cannot confirm ListaSpesaTest', async ({ page }) => {
  const posts = [];
  await page.addInitScript(() => localStorage.setItem('testModeSpesa', 'true'));
  await page.route('https://script.google.com/**', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      posts.push(JSON.parse(request.postData() || '{}'));
      return route.fulfill({ status: 200, body: '' });
    }
    const url = new URL(request.url());
    const callback = url.searchParams.get('callback');
    const data = url.searchParams.get('action') === 'ambiente'
      ? { ok: false, messaggio: 'Azione GET non riconosciuta.' }
      : { ok: true, lista: [] };
    return route.fulfill({
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify(data)});`
    });
  });

  await page.goto('/');
  await page.locator('#btnAdmin').click();
  await expect(page.locator('#testMode')).not.toBeChecked();
  await expect(page.locator('#linkGoogleSheet')).toHaveText('Apri ListaSpesa');
  expect(posts).toEqual([]);
});

test('ORDINI and ACQUISTI group products by the configured category order', async ({ page }) => {
  const lista = [
    { prodotto: 'Pane', quantita: 1, categoria: 'Pane' },
    { prodotto: 'Latte', quantita: 1, categoria: 'Banco frigo' },
    { prodotto: 'Banane', quantita: 2, categoria: 'Frutta e verdura' }
  ];
  const posts = [];
  await page.route('https://script.google.com/**', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      const callback = new URL(request.url()).searchParams.get('callback');
      return route.fulfill({ contentType: 'application/javascript', body: `${callback}(${JSON.stringify({ ok: true, lista })});` });
    }
    const data = JSON.parse(request.postData() || '{}');
    posts.push(data);
    if (data.action === 'categoria') {
      const item = lista.find(elemento => elemento.prodotto === data.prodotto);
      if (item) item.categoria = data.categoria;
    }
    return route.fulfill({ status: 200, body: '' });
  });

  await page.goto('/');
  await expect(page.locator('#lista .categoria-sezione')).toHaveText([
    'Frutta e verdura', 'Banco frigo', 'Pane'
  ]);
  const banane = page.locator('#lista .riga-prodotto').filter({ hasText: 'Banane' });
  await banane.locator('.selettore-categoria').selectOption('Colazione');
  await expect.poll(() => posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ action: 'categoria', prodotto: 'Banane', categoria: 'Colazione', testMode: false });

  await page.locator('#btnAcquisti').click();
  await expect(page.locator('#listaAcquisti .categoria-sezione')).toHaveText([
    'Banco frigo', 'Colazione', 'Pane'
  ]);
  await expect(page.locator('#listaAcquisti .selettore-categoria')).toHaveCount(0);
});

test('initial list read recovers from a transient backend failure without reload', async ({ page }) => {
  let reads = 0;
  await page.route('https://script.google.com/**', async route => {
    reads++;
    if (reads === 1) return route.abort('failed');
    const callback = new URL(route.request().url()).searchParams.get('callback');
    await route.fulfill({
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify({ ok: true, lista: [{ prodotto: 'Latte', quantita: 1 }] })});`
    });
  });
  await page.goto('/');
  await expect(page.locator('.nome-prodotto')).toHaveText('Latte', { timeout: 10000 });
  expect(reads).toBeGreaterThan(1);
  await expect(page.locator('#prodotto')).toBeEnabled();
  await expect(page.locator('#btnAggiungi')).toBeEnabled();
});

test('REQ-PWA-001: install button consumes the browser prompt and reports acceptance', async ({ page }) => {
  await page.route('https://script.google.com/**', async route => {
    const callback = new URL(route.request().url()).searchParams.get('callback');
    await route.fulfill({
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify({ ok: true, lista: [] })});`
    });
  });
  await page.goto('/');

  const installButton = page.locator('#btnInstalla');
  await expect(installButton).toBeHidden();
  await page.evaluate(() => {
    window.__installPromptCalls = 0;
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperties(event, {
      prompt: {
        value: async () => { window.__installPromptCalls++; }
      },
      userChoice: {
        value: Promise.resolve({ outcome: 'accepted', platform: 'web' })
      }
    });
    window.dispatchEvent(event);
    window.__installPromptPrevented = event.defaultPrevented;
  });

  await expect(installButton).toBeVisible();
  await installButton.click();
  await expect(installButton).toBeHidden();
  await expect(page.locator('#messaggio')).toHaveText('Installazione avviata.');
  expect(await page.evaluate(() => window.__installPromptCalls)).toBe(1);
  expect(await page.evaluate(() => window.__installPromptPrevented)).toBe(true);
});

test('REQ-PWA-001: install button stays hidden in standalone mode', async ({ page }) => {
  await page.addInitScript(() => {
    const originalMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = query => query === '(display-mode: standalone)'
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }
      : originalMatchMedia(query);
  });
  await page.route('https://script.google.com/**', async route => {
    const callback = new URL(route.request().url()).searchParams.get('callback');
    await route.fulfill({
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify({ ok: true, lista: [] })});`
    });
  });
  await page.goto('/');
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: async () => {} },
      userChoice: { value: Promise.resolve({ outcome: 'accepted' }) }
    });
    window.dispatchEvent(event);
  });

  await expect(page.locator('#btnInstalla')).toBeHidden();
});

test('REQ-VOICE-001: speech replaces the field and waits for manual add', async ({ page }) => {
  await page.addInitScript(() => {
    window.__voiceStarts = 0;
    class FakeSpeechRecognition {
      constructor() {
        window.__voiceRecognition = this;
      }
      start() {
        window.__voiceStarts++;
        if (this.onstart) this.onstart();
      }
    }
    window.SpeechRecognition = FakeSpeechRecognition;
    window.webkitSpeechRecognition = undefined;
  });
  let lista = [];
  const posts = [];
  await page.route('https://script.google.com/**', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      const callback = new URL(request.url()).searchParams.get('callback');
      return route.fulfill({
        contentType: 'application/javascript',
        body: `${callback}(${JSON.stringify({ ok: true, lista })});`
      });
    }
    const data = JSON.parse(request.postData() || '{}');
    posts.push(data);
    if (data.action === 'aggiungi') lista = [{ prodotto: 'Banane', quantita: 4 }];
    return route.fulfill({ status: 200, body: '' });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Alice', exact: true }).click();
  const input = page.locator('#prodotto');
  const voiceButton = page.locator('#btnVoce');
  await expect(voiceButton).toBeVisible();
  await input.fill('testo precedente');

  await voiceButton.click();
  await expect(voiceButton).toBeDisabled();
  await expect(voiceButton).toHaveAccessibleName('Ascolto in corso');
  await expect(page.locator('#messaggio')).toHaveText('Ascolto...');
  expect(await page.evaluate(() => ({
    starts: window.__voiceStarts,
    lang: window.__voiceRecognition.lang,
    continuous: window.__voiceRecognition.continuous,
    interimResults: window.__voiceRecognition.interimResults,
    maxAlternatives: window.__voiceRecognition.maxAlternatives
  }))).toEqual({
    starts: 1,
    lang: 'it-IT',
    continuous: false,
    interimResults: false,
    maxAlternatives: 1
  });

  await page.evaluate(() => {
    const result = [{ transcript: ' 4 banane ' }];
    result.isFinal = true;
    window.__voiceRecognition.onresult({ resultIndex: 0, results: [result] });
    window.__voiceRecognition.onend();
  });
  await expect(input).toHaveValue('4 banane');
  await expect(voiceButton).toBeEnabled();
  await expect(page.locator('#messaggio')).toHaveText('Testo riconosciuto. Controlla e premi Aggiungi.');
  expect(posts).toHaveLength(0);

  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await expect(page.locator('.nome-prodotto')).toHaveText('Banane');
  await expect(page.locator('.quantita')).toHaveText('4');
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ action: 'aggiungi', testo: '4 banane', utente: 'Alice' });
});

test('REQ-VOICE-001: denied microphone permission restores manual input', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      constructor() { window.__voiceRecognition = this; }
      start() { if (this.onstart) this.onstart(); }
    }
    window.SpeechRecognition = FakeSpeechRecognition;
    window.webkitSpeechRecognition = undefined;
  });
  await page.route('https://script.google.com/**', async route => {
    const callback = new URL(route.request().url()).searchParams.get('callback');
    await route.fulfill({
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify({ ok: true, lista: [] })});`
    });
  });
  await page.goto('/');

  const voiceButton = page.locator('#btnVoce');
  await voiceButton.click();
  await page.evaluate(() => {
    window.__voiceRecognition.onerror({ error: 'not-allowed' });
    window.__voiceRecognition.onend();
  });

  await expect(page.locator('#messaggio')).toHaveText('Permesso microfono negato.');
  await expect(voiceButton).toBeEnabled();
  await expect(page.locator('#prodotto')).toBeEditable();
  await expect(page.locator('#btnAggiungi')).toBeEnabled();
});

test('REQ-VOICE-001: unsupported browser keeps manual input and hides microphone', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true });
  });
  await page.route('https://script.google.com/**', async route => {
    const callback = new URL(route.request().url()).searchParams.get('callback');
    await route.fulfill({
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify({ ok: true, lista: [] })});`
    });
  });
  await page.goto('/');

  await expect(page.locator('#btnVoce')).toBeHidden();
  await expect(page.locator('#prodotto')).toBeEditable();
  await expect(page.locator('#btnAggiungi')).toBeEnabled();
});

test('REQ-IMPORT-001: pasted notes are parsed per line and edits invalidate the preview', async ({ page }) => {
  const posts = [];
  await page.route('https://script.google.com/**', async route => {
    const request = route.request();
    if (request.method() === 'POST') {
      posts.push(JSON.parse(request.postData() || '{}'));
      return route.fulfill({ status: 200, body: '' });
    }
    const callback = new URL(request.url()).searchParams.get('callback');
    return route.fulfill({
      contentType: 'application/javascript',
      body: `${callback}(${JSON.stringify({ ok: true, lista: [] })});`
    });
  });

  await page.goto('/');
  expect(await page.evaluate(() => parseTestoImportazioneClient([
    '2 banane', 'due banane', 'banane due', 'ventotto uova', 'yogurt ventitré'
  ].join('\n')))).toEqual([
    { prodotto: 'Banane', quantita: 2 },
    { prodotto: 'Banane', quantita: 2 },
    { prodotto: 'Banane', quantita: 2 },
    { prodotto: 'Uova', quantita: 28 },
    { prodotto: 'Yogurt', quantita: 23 }
  ]);
  await page.locator('#btnApriImport').click();
  await page.locator('#testoImport').fill([
    '2 banane morbide',
    'detersivo per piatti',
    'scottex',
    'fagioli scatola tre'
  ].join('\n'));
  await page.locator('#btnAnalizzaImport').click();

  await expect(page.locator('.riga-import strong')).toHaveText([
    '2 × Banane morbide',
    '1 × Detersivo per piatti',
    '1 × Scottex',
    '3 × Fagioli scatola'
  ]);
  await expect(page.locator('#riepilogoImport')).toHaveText('4 nuovi, 0 già presenti, 0 duplicati nella nota.');
  await expect(page.locator('#btnConfermaImport')).toBeVisible();
  expect(posts).toHaveLength(0);

  await page.locator('#testoImport').fill('2 banane morbide\nlatte');
  await expect(page.locator('#btnConfermaImport')).toBeHidden();
  await expect(page.locator('.riga-import')).toHaveCount(0);
  expect(posts).toHaveLength(0);
});

test('REQ-IMPORT-001: confirmation sends one bulk request and keeps maximum quantities', async ({ page }) => {
  let lista = [{ prodotto: 'Banane', quantita: 4 }];
  const posts = [];
  await page.route('https://script.google.com/**', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      const callback = new URL(request.url()).searchParams.get('callback');
      return route.fulfill({
        contentType: 'application/javascript',
        body: `${callback}(${JSON.stringify({ ok: true, lista })});`
      });
    }
    const data = JSON.parse(request.postData() || '{}');
    posts.push(data);
    if (data.action === 'importa') {
      lista = [
        { prodotto: 'Banane', quantita: 5 },
        { prodotto: 'Mele', quantita: 5 }
      ];
    }
    return route.fulfill({ status: 200, body: '' });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Alice', exact: true }).click();
  await page.locator('#btnApriImport').click();
  const pasted = [
    '2 banane',
    'due banane',
    'banane cinque',
    'mele tre',
    'cinque mele'
  ].join('\n');
  await page.locator('#testoImport').fill(pasted);
  await page.locator('#btnAnalizzaImport').click();

  await expect(page.locator('#riepilogoImport')).toHaveText('1 nuovi, 1 già presenti, 3 duplicati nella nota.');
  await expect(page.locator('.riga-import small')).toHaveText([
    'Già presente: quantità da 4 a 5.',
    'Duplicato nella nota: verrà usata la quantità 5.',
    'Duplicato nella nota: verrà usata la quantità 5.',
    'Nuovo prodotto: quantità 5.',
    'Duplicato nella nota: verrà usata la quantità 5.'
  ]);
  expect(posts).toHaveLength(0);

  await page.locator('#btnConfermaImport').click();
  await expect(page.locator('#pannelloImport')).toBeHidden();
  await expect(page.locator('.nome-prodotto')).toHaveText(['Banane', 'Mele']);
  await expect(page.locator('.quantita')).toHaveText(['5', '5']);
  expect(posts).toHaveLength(1);
  expect(posts[0]).toEqual({ action: 'importa', testo: pasted, utente: 'Alice', testMode: false });
  await expect(page.locator('#btnApriImport')).toBeEnabled();
});

test('REQ-SYNC-001: stale reconciliation cannot overwrite a newer optimistic mutation', async ({ page }) => {
  let lista = [{ prodotto: 'Latte', quantita: 2 }];
  let reads = 0;
  let resolveFirstReconciliationStarted;
  let resolveReleaseStaleRead;
  let resolveSecondPostStarted;
  let resolveReleaseSecondPost;
  const firstReconciliationStarted = new Promise(resolve => { resolveFirstReconciliationStarted = resolve; });
  const releaseStaleRead = new Promise(resolve => { resolveReleaseStaleRead = resolve; });
  const secondPostStarted = new Promise(resolve => { resolveSecondPostStarted = resolve; });
  const releaseSecondPost = new Promise(resolve => { resolveReleaseSecondPost = resolve; });

  await page.route('https://script.google.com/**', async route => {
    const request = route.request();
    if (request.method() === 'GET') {
      reads++;
      const callback = new URL(request.url()).searchParams.get('callback');
      if (reads === 2) {
        const staleList = lista.map(item => ({ ...item }));
        resolveFirstReconciliationStarted();
        await releaseStaleRead;
        return route.fulfill({
          contentType: 'application/javascript',
          body: `${callback}(${JSON.stringify({ ok: true, lista: staleList })}); window.__staleDelivered = true;`
        });
      }
      return route.fulfill({
        contentType: 'application/javascript',
        body: `${callback}(${JSON.stringify({ ok: true, lista })});${reads >= 3 ? ' window.__freshDelivered = true;' : ''}`
      });
    }

    const dati = JSON.parse(request.postData() || '{}');
    if (dati.action === 'diminuisci') {
      lista = [{ prodotto: 'Latte', quantita: 1 }];
      return route.fulfill({ status: 200, body: '' });
    }
    if (dati.action === 'aumenta') {
      resolveSecondPostStarted();
      await releaseSecondPost;
      lista = [{ prodotto: 'Latte', quantita: 2 }];
      return route.fulfill({ status: 200, body: '' });
    }
    return route.fulfill({ status: 400, body: '' });
  });

  await page.goto('/');
  const quantity = page.locator('.quantita');
  await expect(quantity).toHaveText('2');

  await page.getByRole('button', { name: '−' }).click();
  await expect(quantity).toHaveText('1');
  await firstReconciliationStarted;

  await page.getByRole('button', { name: '+' }).click();
  await expect(quantity).toHaveText('2');
  await secondPostStarted;

  resolveReleaseStaleRead();
  await page.waitForFunction(() => window.__staleDelivered === true);
  await expect(quantity).toHaveText('2');

  resolveReleaseSecondPost();
  await page.waitForFunction(() => window.__freshDelivered === true);
  await expect(quantity).toHaveText('2');
  await expect(page.getByRole('button', { name: '+' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '−' })).toBeEnabled();
});

test('minus, plus and delete update the UI and never leave it frozen', async ({ page }) => {
  let lista = [{ prodotto: 'Latte', quantita: 2 }];

  await page.route('https://script.google.com/**', async route => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'GET') {
      const callback = url.searchParams.get('callback');
      if (!callback) return route.fulfill({ status: 400, body: 'missing callback' });
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `${callback}(${JSON.stringify({ ok: true, lista })});`
      });
    }

    if (request.method() === 'POST') {
      const dati = JSON.parse(request.postData() || '{}');
      const idx = lista.findIndex(x => x.prodotto.toLowerCase() === String(dati.prodotto || '').toLowerCase());
      if (dati.action === 'diminuisci' && idx >= 0) {
        if (lista[idx].quantita > 1) lista[idx] = { ...lista[idx], quantita: lista[idx].quantita - 1 };
        else lista.splice(idx, 1);
      }
      if (dati.action === 'aumenta' && idx >= 0) {
        lista[idx] = { ...lista[idx], quantita: lista[idx].quantita + 1 };
      }
      if (dati.action === 'rimuovi' && idx >= 0) lista.splice(idx, 1);
      return route.fulfill({ status: 200, body: '' });
    }

    return route.fulfill({ status: 405, body: '' });
  });

  await page.goto('/');
  await expect(page.locator('.nome-prodotto')).toHaveText('Latte');
  await expect(page.locator('.quantita')).toHaveText('2');

  await page.getByRole('button', { name: '−' }).click();
  await expect(page.locator('.quantita')).toHaveText('1');
  await expect(page.getByRole('button', { name: '+' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '−' })).toBeEnabled();

  await page.getByRole('button', { name: '+' }).click();
  await expect(page.locator('.quantita')).toHaveText('2');
  await expect(page.getByRole('button', { name: '+' })).toBeEnabled();

  await page.getByRole('button', { name: '🗑' }).click();
  await expect(page.locator('.vuota')).toHaveText('Niente da comprare.');
  await expect(page.locator('#btnAggiungi')).toBeEnabled();
});
