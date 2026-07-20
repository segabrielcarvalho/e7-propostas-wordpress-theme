import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const code = process.env.E7_PROPOSAL_TEST_CODE;
const password = process.env.E7_PROPOSAL_TEST_PASSWORD;

const fillMissingSignerContacts = async (page) => {
  if (await page.locator('#e7-otp-email').isEditable()) {
    await page.locator('#e7-otp-email').fill('signer@example.com');
  }
  if (await page.locator('#e7-otp-phone').isEditable()) {
    const language = await page.locator('html').getAttribute('lang');
    await page.locator('#e7-otp-phone').fill(language?.startsWith('en') ? '851234567' : '11999999999');
  }
};

test('legal pages and public validation are reachable', async ({ page }) => {
  for (const path of ['/privacy/', '/electronic-acceptance/', '/validation/']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
  }
});

test('keeps the footer flush with the viewport on the short landing page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const layout = await page.evaluate(() => ({
    footerBottom: document.querySelector('.trust-footer')?.getBoundingClientRect().bottom,
    viewportBottom: window.innerHeight,
  }));

  expect(layout.footerBottom).toBeCloseTo(layout.viewportBottom, 0);
});

test('private Gutenberg content is unavailable through the public REST collection', async ({ page }) => {
  const response = await page.goto('/wp-json/wp/v2/e7_proposal');
  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText('Runtime Example');
});

test('blocks search crawlers and LLM discovery endpoints', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toMatch(/^User-agent:\s*\*\s*$[\s\S]*^Disallow:\s*\/\s*$/im);

  const home = await request.get('/');
  expect(home.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive, nosnippet, noimageindex');

  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const response = await request.get(path);
    expect(response.status()).toBe(403);
    expect(await response.text()).toContain('Automated AI access is not permitted');
  }
});

test('six OTP boxes combine typing and paste into the single API value', async ({ page }) => {
  await page.setContent(`
    <section data-e7-flow data-locale="pt_BR" data-rest-url="/api" data-csrf="csrf">
      <button data-e7-open-dialog type="button">Open</button>
      <dialog data-e7-dialog open>
        <button data-e7-close-dialog type="button">Close</button>
        <div data-e7-progress><span data-e7-progress-bar></span></div>
        <div class="dialog-progress-labels"><span>Dados</span><span>Método</span><span>Código</span><span>Confirmação</span></div>
        <form data-e7-acceptance-form>
          <section data-e7-step="1"><input name="otp_phone"><input name="otp_email"></section>
          <section data-e7-step="2"></section>
          <section data-e7-step="3">
            <strong data-e7-masked-destination></strong>
            <input data-e7-otp-digit><input data-e7-otp-digit><input data-e7-otp-digit>
            <input data-e7-otp-digit><input data-e7-otp-digit><input data-e7-otp-digit>
            <input name="otp" type="hidden">
          </section>
          <section data-e7-step="4"></section>
          <p data-e7-status></p>
          <button data-e7-resend-otp type="button">Resend</button>
          <button data-e7-prev-step type="button">Previous</button>
          <button data-e7-next-step type="button">Next</button>
          <button type="submit">Submit</button>
        </form>
      </dialog>
    </section>
  `);
  await page.addScriptTag({ path: resolve('assets/js/proposal.js') });

  const digits = page.locator('[data-e7-otp-digit]');
  await digits.first().focus();
  await page.keyboard.type('123456');
  await expect(page.locator('input[name="otp"]')).toHaveValue('123456');

  await digits.first().evaluate((input) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text', '654321');
    input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
  });
  await expect(page.locator('input[name="otp"]')).toHaveValue('654321');

  await page.keyboard.press('Backspace');
  await expect(page.locator('input[name="otp"]')).toHaveValue('65432');
});

test('investment table fits entirely within a mobile proposal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.setContent(`
    <link rel="stylesheet" href="http://proposal.e7-company.local/wp-content/themes/e7-propostas/assets/css/app.css">
    <main class="proposal-content">
      <figure class="wp-block-table e7-investment-table">
        <table>
          <thead><tr><th>Item</th><th>Fee</th></tr></thead>
          <tbody>
            <tr><td>Complete website and catalogue setup</td><td><strong>€1,500</strong></td></tr>
            <tr><td>Website with optional AI WhatsApp assistant</td><td><strong>€2,000</strong></td></tr>
          </tbody>
        </table>
      </figure>
    </main>
  `, { waitUntil: 'networkidle' });

  const dimensions = await page.locator('.e7-investment-table').evaluate((figure) => ({
    containerWidth: figure.getBoundingClientRect().width,
    tableWidth: figure.querySelector('table')?.getBoundingClientRect().width || 0,
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  expect(dimensions.tableWidth).toBeLessThanOrEqual(dimensions.containerWidth + 1);
  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
});

test('private gate is generic, responsive and unlocks only with the proposal password', async ({ page }) => {
  test.skip(!code || !password, 'Set E7_PROPOSAL_TEST_CODE and E7_PROPOSAL_TEST_PASSWORD.');
  await page.goto(`/p/${code}/`);
  await expect(page.locator('main')).not.toContainText('Runtime Example');
  const documentTitle = await page.title();
  expect(documentTitle).toMatch(/^.+ - E7 Company$/);
  expect(documentTitle).not.toContain('Private proposal');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', documentTitle);
  await expect(page.locator('[data-e7-password-form]')).toBeVisible();
  await page.locator('#proposal-password').fill(password);
  await page.getByRole('button', { name: /Continue|Continuar/ }).click();
  await expect(page.locator('[data-e7-open-dialog]')).toBeVisible();
  await expect(page.locator('[data-e7-acceptance-form]')).not.toBeVisible();
  await page.locator('[data-e7-open-dialog]').click();
  await expect(page.locator('.acceptance-dialog')).toHaveAttribute('open', '');
  await expect(page.locator('[data-e7-step="1"]')).toBeVisible();
  await expect(page.locator('[data-e7-step="2"]')).not.toBeVisible();
  await expect(page.locator('[data-e7-progress]')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.locator('.acceptance-dialog')).not.toContainText(/Etapa 1 de 3|Step 1 of 3/);
  await fillMissingSignerContacts(page);
  await page.locator('[data-e7-next-step]').click();
  await expect(page.locator('[data-e7-progress]')).toHaveAttribute('aria-valuenow', '2');
  await expect(page.locator('[data-e7-step="2"]')).toBeVisible();
  await expect(page.locator('[data-e7-progress]')).toHaveAttribute('aria-valuemax', '4');
  await expect(page.locator('input[name="otp_channel"]')).toHaveCount(2);
});

test('chooses email, validates the code and reaches confirmation without accepting', async ({ page }) => {
  test.skip(!code || !password, 'Set E7_PROPOSAL_TEST_CODE and E7_PROPOSAL_TEST_PASSWORD.');
  let sendCount = 0;
  await page.route('**/wp-json/e7-propostas/v1/otp/send', (route) => {
    sendCount += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, channel: 'email', expires_in: 600, dev_code: '123456' }),
    });
  });
  await page.route('**/wp-json/e7-propostas/v1/otp/verify', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true }),
  }));

  await page.goto(`/p/${code}/`);
  await page.locator('#proposal-password').fill(password);
  await page.getByRole('button', { name: /Continue|Continuar/ }).click();
  await page.locator('[data-e7-open-dialog]').click();
  await fillMissingSignerContacts(page);
  await page.locator('[data-e7-next-step]').click();
  await page.locator('input[name="otp_channel"][value="email"]').check();
  await page.locator('[data-e7-next-step]').click();

  await expect(page.locator('[data-e7-step="3"]')).toBeVisible();
  await expect(page.locator('[data-e7-masked-destination]')).toContainText('@');
  expect(sendCount).toBe(1);

  await page.locator('[data-e7-prev-step]').click();
  await page.locator('[data-e7-next-step]').click();
  await expect(page.locator('[data-e7-step="3"]')).toBeVisible();
  expect(sendCount).toBe(1);

  const resendButton = page.locator('[data-e7-resend-otp]');
  await resendButton.click();
  await expect.poll(() => sendCount).toBe(2);
  await expect(resendButton).toBeEnabled();
  const otpDigits = page.locator('[data-e7-otp-digit]');
  await expect(otpDigits).toHaveCount(6);
  for (const [index, digit] of [...'123456'].entries()) {
    await otpDigits.nth(index).fill(digit);
  }
  await page.locator('[data-e7-next-step]').click();
  await expect(page.locator('[data-e7-step="4"]')).toBeVisible();
  await expect(page.locator('[data-e7-progress]')).toHaveAttribute('aria-valuenow', '4');
});

test('shows an international country selector for the SMS contact', async ({ page }) => {
  test.skip(!code || !password, 'Set E7_PROPOSAL_TEST_CODE and E7_PROPOSAL_TEST_PASSWORD.');
  await page.goto(`/p/${code}/`);
  await page.locator('#proposal-password').fill(password);
  await page.getByRole('button', { name: /Continue|Continuar/ }).click();
  await page.locator('[data-e7-open-dialog]').click();

  await expect(page.locator('[data-e7-phone-contact] .iti')).toBeVisible();
  const language = await page.locator('html').getAttribute('lang');
  await expect(page.locator('.iti__selected-country')).toHaveAttribute('title', language?.startsWith('en') ? /Ireland/ : /Brazil|Brasil/);
  await expect(page.locator('#e7-otp-phone')).toHaveAttribute('required', '');
  await expect(page.locator('#e7-otp-email')).toHaveAttribute('required', '');
});
