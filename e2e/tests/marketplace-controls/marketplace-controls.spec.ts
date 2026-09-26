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

async function installVehicleApi(page: import('@playwright/test').Page) {
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

    let data = [...vehicles];
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

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: data.slice(0, limit),
        pagination: { page: Number(url.searchParams.get('page') || '1'), limit, total: data.length, pages: Math.max(1, Math.ceil(data.length / limit)) },
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
    await page.setViewportSize({ width: 1440, height: 1000 });
    await installVehicleApi(page);
    await waitForInventory(page);

    const grid = page.getByTestId('inventory-grid');
    const columns = page.locator('[aria-label="Grid columns"]');

    for (const count of [3, 4, 5]) {
      await columns.getByRole('button', { name: `${count}×` }).click();
      await expect(columns.getByRole('button', { name: `${count}×` })).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(async () => {
        return await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
      }).toBe(count);
    }
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
    await page.locator('[aria-label="Grid columns"]').getByRole('button', { name: '4×' }).click();
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

  test('mobile filter drawer exposes working selectors and closes cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requests = await installVehicleApi(page);
    await waitForInventory(page);

    await page.getByRole('button', { name: /Filters/i }).click();
    await expect(page.getByText('Refine inventory')).toBeVisible();

    const make = page.getByLabel('Mobile make filter');
    const model = page.getByLabel('Mobile model filter');
    await expect(make).toBeVisible();
    await expect(model).toBeVisible();
    expect(await make.locator('option').count()).toBeGreaterThan(1);

    await make.selectOption({ label: 'Nissan' });
    await expect.poll(() => requests.at(-1)?.searchParams.get('brand')).toBe('Nissan');

    await page.getByRole('button', { name: 'Show results' }).click();
    await expect(page.getByText('Refine inventory')).toBeHidden();
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
