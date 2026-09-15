const { test, expect } = require('@playwright/test');

test.use({ serviceWorkers: 'block' });

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

  await page.goto(`https://gigavard.github.io/spesa_pwa/?e2e=${Date.now()}`);
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
