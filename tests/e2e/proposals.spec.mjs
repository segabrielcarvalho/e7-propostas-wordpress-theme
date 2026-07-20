import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const code = process.env.E7_PROPOSAL_TEST_CODE;
const password = process.env.E7_PROPOSAL_TEST_PASSWORD;

const fillMissingSignerContacts = async (page) => {
  if (await page.locator('#e7-otp-email').isEditable()) {
    await page.locator('#e7-otp-email').fill('signer@example.com');
  }
};

const otpMarkup = `
  <section data-e7-step data-e7-step-kind="code" hidden>
    <h2 tabindex="-1">Code</h2><strong data-e7-masked-destination></strong>
    <input data-e7-otp-digit><input data-e7-otp-digit><input data-e7-otp-digit>
    <input data-e7-otp-digit><input data-e7-otp-digit><input data-e7-otp-digit>
    <input name="otp" type="hidden"><button data-e7-resend-otp type="button">Resend</button>
  </section>`;

const flowFixture = ({ irish, otp }) => `
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <section data-e7-flow data-e7-otp-enabled="${otp ? '1' : '0'}" data-e7-irish-flow="${irish ? '1' : '0'}" data-locale="${irish ? 'en_IE' : 'pt_BR'}" data-rest-url="/api" data-csrf="csrf">
    <button data-e7-open-dialog type="button">Open</button>
    <dialog class="acceptance-dialog ${irish ? 'acceptance-dialog-wide' : ''}" data-e7-dialog>
      <div class="dialog-shell">
        <button class="dialog-close" data-e7-close-dialog type="button">Close</button>
        <div class="dialog-progress" data-e7-progress>
          <div class="dialog-progress-track"><span data-e7-progress-bar></span></div>
          <div class="dialog-progress-labels">${(irish
            ? (otp ? ['Responsible', 'Company', 'Billing & use', 'Code', 'Review'] : ['Responsible', 'Company', 'Billing & use', 'Review'])
            : (otp ? ['Details', 'Code', 'Confirmation'] : ['Details', 'Confirmation']))
            .map((label) => `<span>${label}</span>`).join('')}</div>
        </div>
        <form data-e7-acceptance-form novalidate>
          <section class="dialog-step" data-e7-step data-e7-step-kind="details"><h2 tabindex="-1">${irish ? 'Responsible' : 'Details'}</h2>
            <div class="dialog-fields field-grid">
              <label>Name<input name="name" required value="Aoife Murphy"></label><label>Role<input name="responsible_role" ${irish ? 'required' : ''} value="Director"></label>
              <label>Email<input name="email" type="email" required value="aoife@example.ie"></label><label>Phone<input class="e7-phone-input" name="phone" ${irish || !otp ? 'required' : ''} value="+353871234567"></label>
              ${irish ? '' : '<label class="field-span">Company<input name="company" value=""></label>'}
            </div>
          </section>
          ${irish ? `<section class="dialog-step" data-e7-step data-e7-step-kind="company" hidden><h2 tabindex="-1">Company</h2>
            <div class="dialog-fields field-grid">
              <label>Type<select name="business_type"><option value="company" selected>Company</option><option value="sole_trader">Sole trader</option></select></label>
              <label>Legal name<input name="legal_name" required value="Example Limited"></label><label>Trading name<input name="trading_name" value=""></label>
              <label>Registration<input name="registration_number" required value="123456"></label><label class="check-row"><input name="vat_registered" type="checkbox">VAT registered</label>
              <div class="field-span" data-e7-vat-fields hidden><label>VAT number<input name="vat_number"></label></div>
              <label class="field-span">Line 1<input name="registered_line1" required value="1 Main Street"></label><label class="field-span">Line 2<input name="registered_line2" value=""></label>
              <label>City<input name="registered_city" required value="Cork"></label><label>County<input name="registered_county" value=""></label>
              <label>Eircode<input name="registered_eircode" required value="T12 AC11"></label><input name="registered_country_code" type="hidden" value="IE">
            </div>
          </section>
          <section class="dialog-step" data-e7-step data-e7-step-kind="billing" hidden><h2 tabindex="-1">Billing & use</h2>
            <div class="dialog-fields field-grid">
              <label>Finance email<input name="finance_email" type="email"></label><label>PO<input name="purchase_order"></label>
              <label class="check-row"><input name="billing_same_as_registered" type="checkbox" checked>Same billing address</label>
              <div class="conditional-fields field-span" data-e7-billing-address hidden><div class="field-grid">
                <label class="field-span">Line 1<input name="billing_line1"></label><label class="field-span">Line 2<input name="billing_line2"></label><label>City<input name="billing_city"></label><label>County<input name="billing_county"></label><label>Eircode<input name="billing_eircode"></label><input name="billing_country_code" type="hidden" value="IE">
              </div></div>
              <label class="check-row"><input name="payer_same_as_business" type="checkbox" checked>Same payer</label><div class="field-span" data-e7-payer-fields hidden><label>Payer<input name="payer_legal_name"></label></div>
              <label>Service city<input name="service_city" required value="Cork"></label><label>Domain<input name="domain"></label><label class="field-span">WhatsApp<input class="e7-phone-input" name="whatsapp"></label>
            </div>
          </section>` : ''}
          ${otp ? otpMarkup.replace('<section ', '<section class="dialog-step" ') : ''}
          <section class="dialog-step" data-e7-step data-e7-step-kind="review" hidden><h2 tabindex="-1">${irish ? 'Review' : 'Confirmation'}</h2>
            <dl data-e7-review-summary></dl>
            ${irish ? '<input name="confirmation_b2b" type="checkbox" required checked><input name="confirmation_ireland" type="checkbox" required checked><input name="confirmation_accuracy" type="checkbox" required checked>' : ''}
            <input name="consent" type="checkbox" required checked>
          </section>
          <p data-e7-status></p><div class="dialog-actions"><button data-e7-prev-step type="button">Back</button><button data-e7-next-step type="button">Next</button><button type="submit">Accept</button></div>
        </form>
      </div>
    </dialog>
  </section>`;

const installFlow = async (page, options) => {
  await page.setContent(flowFixture(options));
  await page.evaluate(() => {
    window.e7Requests = [];
    window.fetch = async (url, request) => {
      const body = JSON.parse(request.body);
      window.e7Requests.push({ url: String(url), body });
      return new Response(JSON.stringify(String(url).endsWith('/accept')
        ? { verify_url: '/verify/document', download_url: '/download/document' }
        : { ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  });
  if (options.useCss) {
    await page.addStyleTag({ path: resolve('assets/vendor/intl-tel-input/css/intlTelInput.min.css') });
    await page.addStyleTag({ path: resolve('assets/css/app.css') });
  }
  if (options.useIntl) {
    await page.addScriptTag({ path: resolve('assets/vendor/intl-tel-input/js/intlTelInputWithUtils.min.js') });
  }
  await page.addScriptTag({ path: resolve('assets/js/proposal.js') });
  await page.locator('[data-e7-open-dialog]').click();
};

const continueFlow = async (page, count) => {
  for (let index = 0; index < count; index += 1) await page.locator('[data-e7-next-step]').click();
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
        <div class="dialog-progress-labels"><span>Dados</span><span>Código</span><span>Confirmação</span></div>
        <form data-e7-acceptance-form>
          <section data-e7-step="1"><input name="otp_email"></section>
          <section data-e7-step="2">
            <strong data-e7-masked-destination></strong>
            <input data-e7-otp-digit><input data-e7-otp-digit><input data-e7-otp-digit>
            <input data-e7-otp-digit><input data-e7-otp-digit><input data-e7-otp-digit>
            <input name="otp" type="hidden">
          </section>
          <section data-e7-step="3"></section>
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

test('supports the 2 and 4-step OTP-off matrix without calling OTP endpoints', async ({ page }) => {
  for (const irish of [false, true]) {
    await installFlow(page, { irish, otp: false });
    await expect(page.locator('[data-e7-step]')).toHaveCount(irish ? 4 : 2);
    await expect(page.locator('[data-e7-progress]')).toHaveAttribute('aria-valuemax', String(irish ? 4 : 2));

    await continueFlow(page, irish ? 3 : 1);
    await expect(page.locator('[data-e7-step-kind="review"]')).toBeVisible();
    await page.locator('button[type="submit"]').click();

    const requests = await page.evaluate(() => window.e7Requests);
    expect(requests.filter(({ url }) => url.includes('/otp/'))).toHaveLength(0);
    expect(requests.at(-1).url).toContain('/accept');
    expect(requests.at(-1).body.otp).toBe('');
    if (irish) {
      expect(requests.at(-1).body.business_profile).toEqual({
        responsible: { name: 'Aoife Murphy', role: 'Director', email: 'aoife@example.ie', phone: '+353871234567' },
        type: 'company', legal_name: 'Example Limited', trading_name: '', registration_number: '123456',
        vat_registered: false, vat_number: '',
        registered_address: { line1: '1 Main Street', line2: '', city: 'Cork', county: '', eircode: 'T12 AC11', country_code: 'IE' },
        billing_same_as_registered: true,
        billing_address: { line1: '1 Main Street', line2: '', city: 'Cork', county: '', eircode: 'T12 AC11', country_code: 'IE' },
        payer_same_as_business: true, payer_legal_name: '', finance_email: '', purchase_order: '', service_city: 'Cork', domain: '', whatsapp: '',
        confirmations: { b2b: true, ireland: true, accuracy: true },
      });
    }
  }
});

test('supports the 3 and 5-step OTP-on matrix and validates code before submit', async ({ page }) => {
  for (const irish of [false, true]) {
    await installFlow(page, { irish, otp: true });
    await expect(page.locator('[data-e7-step]')).toHaveCount(irish ? 5 : 3);
    await continueFlow(page, irish ? 3 : 1);
    await expect(page.locator('[data-e7-step-kind="code"]')).toBeVisible();
    await page.locator('[data-e7-otp-digit]').first().evaluate((input) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text', '123456');
      input.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData }));
    });
    await page.locator('[data-e7-next-step]').click();
    await expect(page.locator('[data-e7-step-kind="review"]')).toBeVisible();
    await page.locator('button[type="submit"]').click();

    const requests = await page.evaluate(() => window.e7Requests);
    expect(requests.filter(({ url }) => url.endsWith('/otp/send'))).toHaveLength(1);
    expect(requests.filter(({ url }) => url.endsWith('/otp/verify'))).toHaveLength(1);
    expect(requests.at(-1).body.otp).toBe('123456');
  }
});

test('reveals only the Irish conditional fields that the signer activates', async ({ page }) => {
  await installFlow(page, { irish: true, otp: false });
  await continueFlow(page, 1);
  await expect(page.locator('[data-e7-vat-fields]')).toBeHidden();
  await page.locator('[name="vat_registered"]').check();
  await expect(page.locator('[data-e7-vat-fields]')).toBeVisible();
  await page.locator('[name="vat_registered"]').uncheck();
  await expect(page.locator('[data-e7-vat-fields]')).toBeHidden();

  await continueFlow(page, 1);
  await expect(page.locator('[data-e7-billing-address]')).toBeHidden();
  await page.locator('[name="billing_same_as_registered"]').uncheck();
  await expect(page.locator('[data-e7-billing-address]')).toBeVisible();
  await page.locator('[name="payer_same_as_business"]').uncheck();
  await expect(page.locator('[data-e7-payer-fields]')).toBeVisible();
});

test('disables inactive Irish invoice fields and discards stale conditional errors', async ({ page }) => {
  await installFlow(page, { irish: true, otp: false });
  await continueFlow(page, 1);

  const vatNumber = page.locator('[name="vat_number"]');
  await expect(vatNumber).toBeDisabled();
  await page.locator('[name="vat_registered"]').check();
  await expect(vatNumber).toBeEnabled();
  await expect(vatNumber).toHaveAttribute('required', '');
  await vatNumber.evaluate((input) => input.setCustomValidity('stale VAT error'));
  await page.locator('[name="vat_registered"]').uncheck();
  await expect(vatNumber).toBeDisabled();
  await expect(vatNumber).not.toHaveAttribute('required', '');
  await expect(vatNumber).toHaveJSProperty('validationMessage', '');

  await continueFlow(page, 1);
  const billingLine1 = page.locator('[name="billing_line1"]');
  const billingCity = page.locator('[name="billing_city"]');
  const billingEircode = page.locator('[name="billing_eircode"]');
  const payerName = page.locator('[name="payer_legal_name"]');
  await expect(billingLine1).toBeDisabled();
  await expect(payerName).toBeDisabled();

  await page.locator('[name="billing_same_as_registered"]').uncheck();
  await expect(billingLine1).toBeEnabled();
  await expect(billingLine1).toHaveAttribute('required', '');
  await billingLine1.fill('2 Finance Street');
  await billingCity.fill('Dublin');
  await billingEircode.fill('invalid');
  await page.locator('[data-e7-next-step]').click();
  await expect(billingEircode).toBeFocused();
  await expect(billingEircode).toHaveJSProperty('validationMessage', 'Enter a valid Irish Eircode.');

  await page.locator('[name="billing_same_as_registered"]').check();
  await expect(billingEircode).toBeDisabled();
  await expect(billingEircode).not.toHaveAttribute('required', '');
  await expect(billingEircode).toHaveJSProperty('validationMessage', '');

  await page.locator('[name="payer_same_as_business"]').uncheck();
  await expect(payerName).toBeEnabled();
  await expect(payerName).toHaveAttribute('required', '');
  await payerName.evaluate((input) => input.setCustomValidity('stale payer error'));
  await page.locator('[name="payer_same_as_business"]').check();
  await expect(payerName).toBeDisabled();
  await expect(payerName).not.toHaveAttribute('required', '');
  await expect(payerName).toHaveJSProperty('validationMessage', '');

  await page.locator('[data-e7-next-step]').click();
  await expect(page.locator('[data-e7-step-kind="review"]')).toBeVisible();
  await page.locator('button[type="submit"]').click();
  const payload = await page.evaluate(() => window.e7Requests.at(-1).body.business_profile);
  expect(payload.billing_same_as_registered).toBe(true);
  expect(payload.billing_address).toEqual(payload.registered_address);
});

test('reports required Irish company fields in visual order before format errors', async ({ page }) => {
  await installFlow(page, { irish: true, otp: false });
  await continueFlow(page, 1);

  const legalName = page.locator('[name="legal_name"]');
  await legalName.fill('');
  await page.locator('[name="registration_number"]').fill('123456A');
  await page.locator('[data-e7-next-step]').click();

  await expect(page.locator('[data-e7-step-kind="company"]')).toBeVisible();
  await expect(legalName).toBeFocused();
  await expect(legalName).not.toHaveJSProperty('validationMessage', '');
});

test('matches phone requiredness to the backend policy without locking prefilled contacts', async ({ page }) => {
  for (const scenario of [
    { irish: false, otp: true, required: false },
    { irish: false, otp: false, required: true },
    { irish: true, otp: true, required: true },
    { irish: true, otp: false, required: true },
  ]) {
    await installFlow(page, scenario);
    const phone = page.locator('[name="phone"]');
    await expect(phone).toBeEditable();
    if (scenario.required) await expect(phone).toHaveAttribute('required', '');
    else await expect(phone).not.toHaveAttribute('required', '');
    await expect(page.locator('[name="email"]')).toBeEditable();
  }
});

test('validates and normalizes Irish invoice formats on their own fields before review', async ({ page }) => {
  await installFlow(page, { irish: true, otp: false, useIntl: true });
  await continueFlow(page, 1);

  const registration = page.locator('[name="registration_number"]');
  await registration.fill('123456A');
  await page.locator('[data-e7-next-step]').click();
  await expect(page.locator('[data-e7-step-kind="company"]')).toBeVisible();
  await expect(registration).toBeFocused();
  await expect(registration).toHaveJSProperty('validationMessage', 'Enter between 1 and 8 CRO digits.');

  await registration.fill('123456');
  await page.locator('[name="vat_registered"]').check();
  await page.locator('[name="vat_number"]').fill('ie 123-4567a');
  const registeredEircode = page.locator('[name="registered_eircode"]');
  await registeredEircode.fill('not-an-eircode');
  await page.locator('[data-e7-next-step]').click();
  await expect(registeredEircode).toBeFocused();
  await expect(registeredEircode).toHaveJSProperty('validationMessage', 'Enter a valid Irish Eircode.');

  await registeredEircode.fill('t12-ac11');
  await page.locator('[data-e7-next-step]').click();
  await expect(page.locator('[data-e7-step-kind="billing"]')).toBeVisible();
  await expect(page.locator('[name="vat_number"]')).toHaveValue('IE1234567A');
  await expect(registeredEircode).toHaveValue('T12 AC11');

  await page.locator('[name="billing_same_as_registered"]').uncheck();
  await page.locator('[name="billing_line1"]').fill('2 Finance Street');
  await page.locator('[name="billing_city"]').fill('Dublin');
  const billingEircode = page.locator('[name="billing_eircode"]');
  await billingEircode.fill('invalid');
  await page.locator('[data-e7-next-step]').click();
  await expect(billingEircode).toBeFocused();
  await expect(billingEircode).toHaveJSProperty('validationMessage', 'Enter a valid Irish Eircode.');

  await billingEircode.fill('d02-x285');
  const domain = page.locator('[name="domain"]');
  await domain.fill('not a hostname');
  await page.locator('[data-e7-next-step]').click();
  await expect(domain).toBeFocused();
  await expect(domain).toHaveJSProperty('validationMessage', 'Enter a valid hostname.');

  await domain.fill('https://Example.ie/catalogue');
  const whatsapp = page.locator('[name="whatsapp"]');
  await whatsapp.fill('123');
  await page.locator('[data-e7-next-step]').click();
  await expect(whatsapp).toBeFocused();
  await expect(whatsapp).toHaveJSProperty('validationMessage', 'Enter a valid international WhatsApp number.');

  await whatsapp.fill('+353871234567');
  await page.locator('[data-e7-next-step]').click();
  await expect(page.locator('[data-e7-step-kind="review"]')).toBeVisible();
  await page.locator('button[type="submit"]').click();
  const payload = await page.evaluate(() => window.e7Requests.at(-1).body.business_profile);
  expect(payload.registration_number).toBe('123456');
  expect(payload.vat_number).toBe('IE1234567A');
  expect(payload.registered_address.eircode).toBe('T12 AC11');
  expect(payload.billing_address.eircode).toBe('D02 X285');
  expect(payload.domain).toBe('example.ie');
  expect(payload.whatsapp).toBe('+353871234567');
});

test('guides OTP-off implicit submit to complete the remaining review steps', async ({ page }) => {
  await installFlow(page, { irish: true, otp: false });
  await page.locator('[data-e7-acceptance-form]').evaluate((form) => form.requestSubmit());
  await expect(page.locator('[data-e7-status]')).toHaveText('Complete the remaining steps and review your details before accepting.');
  await expect(page.locator('[data-e7-status]')).not.toContainText(/code/i);
});

test('keeps four and five-step progress plus international inputs inside 375px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const otp of [false, true]) {
    await installFlow(page, { irish: true, otp, useCss: true, useIntl: true });
    await expect(page.locator('.acceptance-dialog > .dialog-shell > .dialog-progress')).toBeVisible();
    await expect(page.locator('.dialog-step:not([hidden]) .field-grid .iti')).toBeVisible();
    const dimensions = await page.evaluate(() => {
      const dialog = document.querySelector('[data-e7-dialog]');
      const labels = document.querySelector('.dialog-progress-labels');
      const phone = document.querySelector('.iti');
      return {
        page: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
        dialogScroll: dialog.scrollWidth,
        dialogClient: dialog.clientWidth,
        labelsScroll: labels.scrollWidth,
        labelsClient: labels.clientWidth,
        visibleLabels: [...labels.children].filter((label) => label.getClientRects().length > 0).length,
        phoneRight: phone.getBoundingClientRect().right,
        phoneParentRight: phone.parentElement.getBoundingClientRect().right,
      };
    });
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.dialogScroll).toBeLessThanOrEqual(dimensions.dialogClient);
    expect(dimensions.labelsScroll).toBeLessThanOrEqual(dimensions.labelsClient);
    expect(dimensions.visibleLabels).toBe(1);
    expect(dimensions.phoneRight).toBeLessThanOrEqual(dimensions.phoneParentRight + 1);
  }
});

test('keeps three accepted actions stacked without mobile overflow', async ({ page }) => {
  await page.setContent(`
    <link rel="stylesheet" href="http://proposal.e7-company.local/wp-content/themes/e7-propostas/assets/css/app.css">
    <div class="signature-inner"><div class="signer-row"><div class="signer-info"><strong>Aoife</strong><span>aoife@example.ie</span></div><div class="signer-actions">
      <a class="button-secondary">Validate document</a><a class="button-primary">Download final copy</a><a class="button-primary">Download invoice</a>
    </div></div></div>`, { waitUntil: 'networkidle' });
  const dimensions = await page.locator('.signer-row').evaluate((row) => ({
    right: row.getBoundingClientRect().right,
    viewport: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.right).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.viewport);
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
  await expect(page.locator('[data-e7-progress]')).toHaveAttribute('aria-valuemax', '3');
  await expect(page.locator('input[name="otp_channel"]')).toHaveCount(0);
  await expect(page.locator('[data-e7-phone-contact]')).toHaveCount(0);
});

test('sends email, validates the code and reaches confirmation without accepting', async ({ page }) => {
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

  await expect(page.locator('[data-e7-step="2"]')).toBeVisible();
  await expect(page.locator('[data-e7-masked-destination]')).toContainText('@');
  expect(sendCount).toBe(1);

  await page.locator('[data-e7-prev-step]').click();
  await page.locator('[data-e7-next-step]').click();
  await expect(page.locator('[data-e7-step="2"]')).toBeVisible();
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
  await expect(page.locator('[data-e7-step="3"]')).toBeVisible();
  await expect(page.locator('[data-e7-progress]')).toHaveAttribute('aria-valuenow', '3');
});

test('does not expose SMS and keeps editable contact fields for compatibility', async ({ page }) => {
  test.skip(!code || !password, 'Set E7_PROPOSAL_TEST_CODE and E7_PROPOSAL_TEST_PASSWORD.');
  await page.goto(`/p/${code}/`);
  await page.locator('#proposal-password').fill(password);
  await page.getByRole('button', { name: /Continue|Continuar/ }).click();
  await page.locator('[data-e7-open-dialog]').click();

  await expect(page.locator('input[name="phone"]')).toBeVisible();
  await expect(page.locator('input[name="phone"]')).toBeEditable();
  await expect(page.getByText('SMS', { exact: true })).toHaveCount(0);
  await expect(page.locator('#e7-otp-email')).toHaveAttribute('required', '');
  await expect(page.locator('#e7-otp-email')).toBeEditable();
});
