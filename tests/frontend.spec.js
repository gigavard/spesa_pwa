const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

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
