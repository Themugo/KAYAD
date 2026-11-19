import { test, expect } from '@playwright/test';

const vehicles = Array.from({ length: 6 }, (_, index) => ({
  id: `e2e-car-${index + 1}`,
  title: `${['Toyota', 'Nissan', 'Mazda'][index % 3]} Test Vehicle ${index + 1}`,
  brand: ['Toyota', 'Nissan', 'Mazda'][index % 3],
  model: ['Harrier', 'X-Trail', 'CX-5'][index % 3],
  year: 2020 + (index % 4),
  price: 2500000 + index * 500000,
  mileage: 30000 + index * 5000,
  fuel: ['Petrol', 'Diesel'][index % 2],
  transmission: ['Automatic', 'Manual'][index % 2],
  body_type: ['SUV', 'Sedan'][index % 2],
  color: 'White',
  condition: ['Foreign Used', 'Locally Used'][index % 2],
  location_city: ['Nairobi', 'Mombasa'][index % 2],
  status: 'available',
  images: [],
  features: [],
  has_auction: index === 0,
  auction_status: index === 0 ? 'live' : 'none',
  is_verified_dealer: index % 2 === 0,
  dealer_id: index % 2 === 0 ? `dealer-${index}` : null,
  dealer: index % 2 === 0 ? { name: 'Verified Dealer', role: 'dealer', dealerApprovedAt: '2026-01-01' } : null,
}));

async function installVehicleApi(page: import('@playwright/test').Page, sourceVehicles = vehicles) {
  const requests: URL[] = [];
  await page.route('**/api/cars**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const limit = Number(url.searchParams.get('limit') || '24');
    const keyword = url.searchParams.get('keyword');
    const brand = url.searchParams.get('brand');
    const model = url.searchParams.get('model');
    const body = url.searchParams.get('body');
    const fuel = url.searchParams.get('fuel');
    const transmission = url.searchParams.get('transmission');
    const dealerType = url.searchParams.get('dealerType');
    const sort = url.searchParams.get('sort');

    let data = [...sourceVehicles];
    if (keyword) data = data.filter((v) => `${v.title} ${v.brand} ${v.model}`.toLowerCase().includes(keyword.toLowerCase()));
    if (brand) data = data.filter((v) => v.brand === brand);
    if (model) data = data.filter((v) => v.model === model);
    if (body) data = data.filter((v) => v.body_type === body);
    if (fuel) data = data.filter((v) => v.fuel === fuel);
    if (transmission) data = data.filter((v) => v.transmission === transmission);
    if (dealerType === 'dealer') data = data.filter((v) => Boolean(v.dealer_id));
    if (dealerType === 'private') data = data.filter((v) => !v.dealer_id);

    if (sort === 'price_asc') data.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') data.sort((a, b) => b.price - a.price);

    const pageNumber = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const start = (pageNumber - 1) * limit;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: data.slice(start, start + limit),
        pagination: { page: pageNumber, limit, total: data.length, pages: Math.max(1, Math.ceil(data.length / limit)) },
      }),
    });
  });
  return requests;
}

async function waitForInventory(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByTestId('inventory-grid')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Vehicle Inventory')).toBeVisible();
}

test.describe('KAYAD marketplace controls — browser interaction certification', () => {
  test('3/4/5 column controls change the real rendered desktop grid', async ({ page }) => {
    // The grid follows container queries on the RESULT AREA (src/index.css .kayad-inventory-grid): 5 columns need
    // >= 1120px of result width, otherwise the 5-column choice is capped at 4 to keep cards readable. Measure at a
    // width where the result area allows 5; the capped behaviour is asserted separately below.
    await page.setViewportSize({ width: 1920, height: 1000 });
    await installVehicleApi(page);
    await waitForInventory(page);

    const grid = page.getByTestId('inventory-grid');
    const columns = page.getByRole('group', { name: 'Desktop grid columns' });

    for (const count of [3, 4, 5]) {
      await columns.getByRole('button', { name: `${count}×` }).click();
      await expect(columns.getByRole('button', { name: `${count}×` })).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => {
        return await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
      }).toBe(count);
    }
  });

  test('5-column choice is capped at 4 when the result area is narrower than 1120px (documented container query)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await installVehicleApi(page);
    await waitForInventory(page);
    const grid = page.getByTestId('inventory-grid');
    const resultWidth = await grid.evaluate((el) => el.getBoundingClientRect().width);
    await page.getByRole('group', { name: 'Desktop grid columns' }).getByRole('button', { name: '5×' }).click();
    await expect(grid).toHaveAttribute('data-columns', '5');
    await expect.poll(async () => grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length))
      .toBe(resultWidth >= 1120 ? 5 : 4);
  });

  test('grid responds honestly across mobile, tablet and desktop breakpoints', async ({ page }) => {
    await installVehicleApi(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await waitForInventory(page);
    await expect.poll(async () => {
      return await page.getByTestId('inventory-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
    }).toBe(1);

    await page.setViewportSize({ width: 700, height: 900 });
    await expect.poll(async () => {
      return await page.getByTestId('inventory-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
    }).toBe(2);

    await page.setViewportSize({ width: 900, height: 900 });
    await page.getByRole('group', { name: 'Desktop grid columns' }).getByRole('button', { name: '4×' }).click();
    await expect.poll(async () => {
      return await page.getByTestId('inventory-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
    }).toBe(4);
  });

  test('desktop sidebar dropdowns remain populated and send their real backend query parameters', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const requests = await installVehicleApi(page);
    await waitForInventory(page);

    const checks: Array<[string, string, string]> = [
      ['Sidebar make filter', 'Nissan', 'brand'],
      ['Sidebar model filter', 'X-Trail', 'model'],
      ['Sidebar body style filter', 'Sedan', 'body'],
      ['Sidebar fuel filter', 'Diesel', 'fuel'],
      ['Sidebar transmission filter', 'Manual', 'transmission'],
      ['Sidebar seller type filter', 'Verified Dealer', 'dealerType'],
    ];

    for (const [label, value, queryKey] of checks) {
      const select = page.getByLabel(label);
      await expect(select).toBeVisible();
      expect(await select.locator('option').count()).toBeGreaterThan(1);
      await select.selectOption({ label: value });
      await expect.poll(() => requests.at(-1)?.searchParams.get(queryKey)).toBe(value === 'Verified Dealer' ? 'dealer' : value);
    }

    const sort = page.getByLabel('Sort inventory');
    await sort.selectOption('price-desc');
    await expect.poll(() => requests.at(-1)?.searchParams.get('sort')).toBe('price_desc');
  });

  test('show/page-size and grid/list controls update the live inventory state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const requests = await installVehicleApi(page);
    await waitForInventory(page);

    await page.getByRole('button', { name: '48', exact: true }).click();
    await expect.poll(() => requests.at(-1)?.searchParams.get('limit')).toBe('48');

    await page.getByTitle('List view').click();
    await expect(page.getByTestId('inventory-grid')).toHaveAttribute('data-view-mode', 'list');
    await expect(page.getByTitle('Grid view')).toHaveAttribute('aria-pressed', 'false');

    await page.getByTitle('Grid view').click();
    await expect(page.getByTestId('inventory-grid')).toHaveAttribute('data-view-mode', 'grid');
  });

  test('server pagination supports direct pages, previous/next boundaries and page-size resets', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const pagedVehicles = Array.from({ length: 60 }, (_, index) => ({
      ...vehicles[index % vehicles.length],
      id: `paged-car-${index + 1}`,
      title: `${vehicles[index % vehicles.length].brand} Test Vehicle ${index + 1}`,
    }));
    const requests = await installVehicleApi(page, pagedVehicles);
    await waitForInventory(page);

    const pagination = page.getByTestId('inventory-pagination');
    const previous = pagination.getByRole('button', { name: 'Previous page' });
    const next = pagination.getByRole('button', { name: 'Next page' });
    const summary = page.getByTestId('pagination-summary');

    await expect(summary).toContainText('Showing 1–24 of 60 vehicles');
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Go to page 1' })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('button', { name: 'Go to page 3' }).click();
    await expect.poll(() => requests.at(-1)?.searchParams.get('page')).toBe('3');
    await expect(summary).toContainText('Showing 49–60 of 60 vehicles');
    await expect(page.locator('.kayad-vehicle-card').first()).toContainText('Test Vehicle 49');
    await expect(next).toBeDisabled();
    await expect(previous).toBeEnabled();

    await previous.click();
    await expect.poll(() => requests.at(-1)?.searchParams.get('page')).toBe('2');
    await expect(summary).toContainText('Showing 25–48 of 60 vehicles');
    await expect(page.locator('.kayad-vehicle-card').first()).toContainText('Test Vehicle 25');

    await page.getByRole('button', { name: '48', exact: true }).click();
    await expect.poll(() => requests.at(-1)?.searchParams.get('page')).toBe('1');
    await expect.poll(() => requests.at(-1)?.searchParams.get('limit')).toBe('48');
    await expect(summary).toContainText('Showing 1–48 of 60 vehicles');
    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();

    await next.click();
    await expect.poll(() => requests.at(-1)?.searchParams.get('page')).toBe('2');
    await expect(summary).toContainText('Showing 49–60 of 60 vehicles');
    await expect(next).toBeDisabled();
  });

  test('phone Grid/List switch changes the rendered card layout, preserves actions and never overflows', async ({ page }) => {
    await installVehicleApi(page);

    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 844 });
      await waitForInventory(page);

      const grid = page.getByTestId('inventory-grid');
      const controls = page.getByTestId('inventory-view-controls');
      const gridButton = page.getByRole('button', { name: 'Grid view' });
      const listButton = page.getByRole('button', { name: 'List view' });
      const card = page.locator('.kayad-vehicle-card').first();

      await expect(controls).toBeVisible();
      await expect(gridButton).toBeVisible();
      await expect(listButton).toBeVisible();
      await expect.poll(() => gridButton.evaluate((el) => Math.min(el.getBoundingClientRect().width, el.getBoundingClientRect().height))).toBeGreaterThanOrEqual(44);
      await expect.poll(() => listButton.evaluate((el) => Math.min(el.getBoundingClientRect().width, el.getBoundingClientRect().height))).toBeGreaterThanOrEqual(44);

      // Grid is a full-width, image-first vertical card on phones.
      await gridButton.click();
      await expect(grid).toHaveAttribute('data-view-mode', 'grid');
      await expect.poll(() => card.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('column');
      await expect.poll(() => grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length)).toBe(1);

      // List must materially change the card, not just the selected button state.
      await listButton.click();
      await expect(grid).toHaveAttribute('data-view-mode', 'list');
      await expect.poll(() => card.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('row');
      await expect.poll(() => card.locator('.kayad-vc-media').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(148);
      await expect.poll(() => card.locator('.kayad-vc-body').evaluate((el) => el.getBoundingClientRect().width)).toBeGreaterThan(0);

      // Shared card actions remain available in either layout.
      await expect(card.getByRole('button', { name: /Save .*$/ })).toBeVisible();
      await expect(card.getByRole('button', { name: /View vehicle details/i })).toBeVisible();
      await expect(card.getByRole('button', { name: /Contact seller about/i })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      await gridButton.click();
      await expect.poll(() => card.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('column');
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }

    // Also verify that the desktop list is a genuinely horizontal card, while
    // returning to grid restores the selected column layout.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect.poll(() => gridButton.isVisible()).toBe(true);
    await listButton.click();
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('row');
    await gridButton.click();
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).flexDirection)).toBe('column');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('inventory Grid/List renders correctly at all six supported viewport widths', async ({ page }) => {
    await installVehicleApi(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await waitForInventory(page);

    const widths = [1440, 1280, 1024, 768, 390, 360];
    const grid = page.getByTestId('inventory-grid');
    const controls = page.getByTestId('inventory-view-controls');
    const gridButton = page.getByRole('button', { name: 'Grid view' });
    const listButton = page.getByRole('button', { name: 'List view' });
    const card = page.locator('.kayad-vehicle-card').first();

    for (const width of widths) {
      await page.setViewportSize({ width, height: width <= 768 ? 900 : 1000 });
      await expect(controls).toBeVisible();
      await expect(gridButton).toBeVisible();
      await expect(listButton).toBeVisible();

      for (const mode of ['grid', 'list'] as const) {
        const toggle = mode === 'grid' ? gridButton : listButton;
        await toggle.click();
        await expect(grid).toHaveAttribute('data-view-mode', mode);
        await expect.poll(() => card.evaluate((el) => getComputedStyle(el).flexDirection))
          .toBe(mode === 'grid' ? 'column' : 'row');

        const geometry = await page.evaluate(() => {
          const inventory = document.querySelector('[data-testid="inventory-grid"]');
          const firstCard = inventory?.querySelector('.kayad-vehicle-card');
          const media = firstCard?.querySelector('.kayad-vc-media');
          const body = firstCard?.querySelector('.kayad-vc-body');
          const rect = firstCard?.getBoundingClientRect();
          return {
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            bodyWidth: document.body.scrollWidth,
            cardLeft: rect?.left ?? -1,
            cardRight: rect?.right ?? Number.POSITIVE_INFINITY,
            cardWidth: rect?.width ?? 0,
            mediaWidth: media?.getBoundingClientRect().width ?? 0,
            contentWidth: body?.getBoundingClientRect().width ?? 0,
            gridColumns: inventory ? getComputedStyle(inventory).gridTemplateColumns.trim().split(/\s+/).length : 0,
          };
        });

        expect(geometry.documentWidth, `document overflow at ${width}px in ${mode}`).toBeLessThanOrEqual(width);
        expect(geometry.bodyWidth, `body overflow at ${width}px in ${mode}`).toBeLessThanOrEqual(width);
        expect(geometry.cardLeft, `card starts outside viewport at ${width}px in ${mode}`).toBeGreaterThanOrEqual(0);
        expect(geometry.cardRight, `card ends outside viewport at ${width}px in ${mode}`).toBeLessThanOrEqual(width + 1);
        expect(geometry.cardWidth, `card has no width at ${width}px in ${mode}`).toBeGreaterThan(0);
        expect(geometry.mediaWidth, `vehicle media missing at ${width}px in ${mode}`).toBeGreaterThan(0);
        expect(geometry.contentWidth, `vehicle content missing at ${width}px in ${mode}`).toBeGreaterThan(0);

        if (width <= 639 && mode === 'grid') {
          expect(geometry.gridColumns, `phone grid must be one column at ${width}px`).toBe(1);
        }
        if (mode === 'list') {
          expect(geometry.mediaWidth, `list media must remain narrower than card at ${width}px`)
            .toBeLessThan(geometry.cardWidth);
        }

        await expect(card.getByRole('button', { name: /Save .*$/ })).toBeVisible();
        await expect(card.getByRole('button', { name: /View vehicle details/i })).toBeVisible();
        await expect(card.getByRole('button', { name: /Contact seller about/i })).toBeVisible();

        if (width <= 390) {
          const bounds = await toggle.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
          });
          expect(bounds.width, `touch target width at ${width}px`).toBeGreaterThanOrEqual(44);
          expect(bounds.height, `touch target height at ${width}px`).toBeGreaterThanOrEqual(44);
        }

        await page.screenshot({
          path: `test-results/inventory-responsive-06d/${width}-${mode}.png`,
          fullPage: false,
        });
      }
    }
  });

  test('mobile filter drawer exposes working selectors and closes cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requests = await installVehicleApi(page);
    await waitForInventory(page);

    await page.getByRole('button', { name: /Filters/i }).click();
    // The drawer is a modal dialog; the desktop sidebar keeps its own (hidden on mobile) "Refine inventory" heading.
    const drawer = page.getByRole('dialog', { name: 'Refine inventory' });
    await expect(drawer).toBeVisible();

    const make = page.getByLabel('Mobile make filter');
    const model = page.getByLabel('Mobile model filter');
    await expect(make).toBeVisible();
    await expect(model).toBeVisible();
    expect(await make.locator('option').count()).toBeGreaterThan(1);

    await make.selectOption({ label: 'Nissan' });
    await expect.poll(() => requests.at(-1)?.searchParams.get('brand')).toBe('Nissan');

    await page.getByRole('button', { name: 'Show results' }).click();
    await expect(page.getByRole('dialog', { name: 'Refine inventory' })).toBeHidden();
  });
  test('hero search dropdowns remain functional and drive the real filter state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requests = await installVehicleApi(page);
    await waitForInventory(page);

    const price = page.getByLabel('Hero maximum price filter');
    const year = page.getByLabel('Hero year filter');
    const body = page.getByLabel('Hero body style filter');
    const make = page.getByLabel('Hero make filter');

    await expect(price).toBeVisible();
    await expect(year).toBeVisible();
    await expect(body).toBeVisible();
    await expect(make).toBeVisible();

    await price.selectOption('4000000');
    await year.selectOption('2023');
    await body.selectOption({ label: 'SUV' });
    await make.selectOption({ label: 'Nissan' });

    await expect.poll(() => requests.at(-1)?.searchParams.get('brand')).toBe('Nissan');
    await expect.poll(() => requests.at(-1)?.searchParams.get('yearMin')).toBe('2023');
    await expect.poll(() => requests.at(-1)?.searchParams.get('body')).toBe('SUV');
    await expect.poll(() => requests.at(-1)?.searchParams.get('maxPrice')).toBe('4000000');
  });

  test('admin escrow dropdowns have stable accessible controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    // "Customize Home Page" is rendered for administrators only (asserted by the VehicleMarketplace unit tests), so this
    // browser check needs an administrator session. Fixture: the session bootstrap answers with an admin user.
    await page.route('**/api/v1/auth/me', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, user: { id: 'e2e-admin', name: 'E2E Admin', email: 'admin@example.co.ke', role: 'admin', status: 'approved', emailVerified: true } }),
    }));
    await installVehicleApi(page);
    await waitForInventory(page);

    await page.getByTitle('Customize Home Page').click();
    const dealer = page.getByLabel('Verified dealer escrow requirement');
    const seller = page.getByLabel('Private seller escrow requirement');
    await expect(dealer).toBeVisible();
    await expect(seller).toBeVisible();
    expect(await dealer.locator('option').count()).toBeGreaterThan(1);
    expect(await seller.locator('option').count()).toBeGreaterThan(1);
  });

});
