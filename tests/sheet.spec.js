const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// Use the app's actual endpoint, with no interception of backend traffic.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const api = html.match(/const API = '([^']+)'/)[1];

async function assertTestBackend(request) {
  const response = await request.get(api, {
    params: { action: 'ambiente', testMode: 'true', _: randomUUID() },
    timeout: 20000
  });
  expect(response.ok(), `Backend environment HTTP status ${response.status()}`).toBeTruthy();
  const data = await response.json();
  expect(data).toMatchObject({ ok: true, testMode: true, spreadsheet: 'ListaSpesaTest' });
}

async function readSheet(request) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await request.get(api, {
        params: { action: 'lista', testMode: 'true', _: randomUUID() },
        timeout: 20000
      });
      expect(response.ok(), `Backend read HTTP status ${response.status()}`).toBeTruthy();
      const data = await response.json();
      expect(data.ok, data.messaggio || 'Backend read result').toBe(true);
      expect(Array.isArray(data.lista)).toBe(true);
      return data.lista;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastError;
}

async function persistedQuantity(request, product) {
  const list = await readSheet(request);
  const matches = list.filter(item => item.prodotto === product);
  expect(matches.length, 'No duplicate test products').toBeLessThanOrEqual(1);
  return matches.length ? Number(matches[0].quantita) : null;
}

async function assertUsable(page, row, present) {
  for (const id of ['prodotto', 'btnAggiungi', 'btnChiudi', 'btnPulisci']) {
    await expect(page.locator(`#${id}`)).toBeEnabled();
  }
  if (present) {
    for (const name of ['−', '+', '🗑']) {
      await expect(row.getByRole('button', { name, exact: true })).toBeEnabled();
    }
  }
  // Interact with the input as well as checking its disabled property.
  await page.locator('#prodotto').fill('verifica interfaccia');
  await expect(page.locator('#prodotto')).toHaveValue('verifica interfaccia');
  await page.locator('#prodotto').clear();
}

test('browser CRUD is reconciled with ListaSpesaTest without reload', async ({ page, request }, testInfo) => {
  const product = `Codex e2e ${randomUUID()}`;
  const row = page.locator('.riga-prodotto').filter({
    has: page.locator('.nome-prodotto', { hasText: product })
  });
  const evidence = [];
  let navigations = 0;
  let mutationAttempted = false;
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) navigations++;
  });

  try {
    // Fail before any write unless the deployed backend confirms the isolated Sheet.
    await assertTestBackend(request);
    expect(await persistedQuantity(request, product)).toBe(null);
    await page.addInitScript(() => localStorage.setItem('testModeSpesa', 'true'));
    await page.goto('/');
    await expect(page.locator('#lista')).not.toBeEmpty({ timeout: 20000 });
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.getByRole('button', { name: 'Giulio', exact: true }).click();

    async function operation(label, act, quantity) {
      await test.step(label, async () => {
        // Require a real browser JSONP reread after the mutation, not just the
        // optimistic UI. Follow the request's redirect chain back to Apps Script.
        const newRequests = new Set();
        const recordRequest = request => newRequests.add(request);
        page.on('request', recordRequest);
        const reconciled = page.waitForResponse(response => {
          if (!response.ok()) return false;
          let original = response.request();
          while (original.redirectedFrom()) original = original.redirectedFrom();
          const url = new URL(original.url());
          return newRequests.has(original) && original.method() === 'GET' && url.origin === new URL(api).origin &&
            url.searchParams.get('action') === 'lista';
        }, { timeout: 45000 });
        // Attach rejection handling immediately if the click itself fails.
        reconciled.catch(() => {});
        await act();
        if (quantity === null) await expect(row).toHaveCount(0);
        else await expect(row.locator('.quantita')).toHaveText(String(quantity));
        const response = await reconciled.finally(() => page.off('request', recordRequest));
        const body = await response.text();
        const match = body.match(/^[\w$]+\(([\s\S]*)\);?\s*$/);
        expect(match, 'Browser received valid JSONP').not.toBe(null);
        const data = JSON.parse(match[1]);
        expect(data.ok).toBe(true);
        const saved = data.lista.find(item => item.prodotto === product);
        expect(saved ? Number(saved.quantita) : null, 'Browser reconciliation sees persisted state').toBe(quantity);
        await expect.poll(() => persistedQuantity(request, product), {
          timeout: 45000, intervals: [500, 1000, 2000], message: `${label}: Google Sheet state`
        }).toBe(quantity);
        if (quantity === null) await expect(row).toHaveCount(0);
        else await expect(row.locator('.quantita')).toHaveText(String(quantity));
        await assertUsable(page, row, quantity !== null);
        expect(navigations, 'No manual or automatic page reload').toBe(1);
        evidence.push({ operation: label, frontend: quantity, sheet: quantity, usable: true, navigations });
      });
    }

    await operation('aggiunta', async () => {
      await page.locator('#prodotto').fill(product);
      mutationAttempted = true;
      await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
    }, 1);
    await operation('incremento', () => row.getByRole('button', { name: '+', exact: true }).click(), 2);
    await operation('decremento', () => row.getByRole('button', { name: '−', exact: true }).click(), 1);
    await operation('eliminazione', () => row.getByRole('button', { name: '🗑', exact: true }).click(), null);
  } finally {
    const evidencePath = testInfo.outputPath('sheet-evidence.json');
    fs.writeFileSync(evidencePath, JSON.stringify({ product, evidence }, null, 2));
    await testInfo.attach('sheet-evidence', {
      path: evidencePath, contentType: 'application/json'
    });
    if (mutationAttempted) {
      // Cleanup has its own budget even when the test exhausted its timeout.
      testInfo.setTimeout(testInfo.timeout + 90000);
      await test.step('cleanup: only the unique test product', async () => {
        // Inspect persistence even if the write response was lost. Delete only
        // this run's product; never close the list or clear the history.
        await expect.poll(async () => {
          const quantity = await persistedQuantity(request, product);
          if (quantity === null) return null;
          try {
            await request.post(api, {
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              data: JSON.stringify({ action: 'rimuovi', prodotto: product, testMode: true }),
              timeout: 15000
            });
          } catch (_) {
            // A lost write response is not proof the deletion failed.
          }
          return persistedQuantity(request, product);
        }, {
          timeout: 60000, intervals: [500, 1000, 2000], message: `Cleanup failed: ${product}`
        }).toBe(null);
        const cleanupPath = testInfo.outputPath('cleanup-evidence.json');
        fs.writeFileSync(cleanupPath, JSON.stringify({ product, absentFromSheet: true }, null, 2));
        await testInfo.attach('cleanup-evidence', { path: cleanupPath, contentType: 'application/json' });
      });
    }
  }
});

test('REQ-IMPORT-001: ListaSpesaTest bulk import deduplicates and keeps maximum quantities', async ({ request }, testInfo) => {
  const runId = randomUUID();
  const firstProduct = `Codex import ${runId}`;
  const secondProduct = `Codex import altro ${runId}`;
  const products = [firstProduct, secondProduct];
  let mutationAttempted = false;

  async function removeTestProducts() {
    for (const product of products) {
      await expect.poll(async () => {
        if (await persistedQuantity(request, product) === null) return null;
        try {
          await request.post(api, {
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            data: JSON.stringify({ action: 'rimuovi', prodotto: product, testMode: true }),
            timeout: 15000
          });
        } catch (_) {
          // A lost POST response does not establish whether the deletion ran.
        }
        return persistedQuantity(request, product);
      }, {
        timeout: 60000, intervals: [500, 1000, 2000], message: `Cleanup failed: ${product}`
      }).toBe(null);
    }
  }

  async function postImport(testo, utente) {
    try {
      await request.post(api, {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        data: JSON.stringify({ action: 'importa', testo, utente, testMode: true }),
        timeout: 20000
      });
    } catch (_) {
      // Persistence is established by the independent GET polls below.
    }
  }

  try {
    await assertTestBackend(request);
    for (const product of products) expect(await persistedQuantity(request, product)).toBe(null);
    mutationAttempted = true;
    await postImport(`2 ${firstProduct}\n${firstProduct} tre\n${secondProduct}`, 'Giulio');

    await expect.poll(() => persistedQuantity(request, firstProduct), {
      timeout: 45000, intervals: [500, 1000, 2000]
    }).toBe(3);
    await expect.poll(() => persistedQuantity(request, secondProduct), {
      timeout: 45000, intervals: [500, 1000, 2000]
    }).toBe(1);

    await postImport(`quattro ${firstProduct}\nun ${secondProduct}`, 'Alice');

    await expect.poll(() => persistedQuantity(request, firstProduct), {
      timeout: 45000, intervals: [500, 1000, 2000]
    }).toBe(4);
    await expect.poll(() => persistedQuantity(request, secondProduct), {
      timeout: 45000, intervals: [500, 1000, 2000]
    }).toBe(1);
  } finally {
    if (mutationAttempted) {
      testInfo.setTimeout(testInfo.timeout + 90000);
      await removeTestProducts();
    }
  }
});
