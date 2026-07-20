import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('declares an independent E7 Propostas theme', async () => {
  const style = await read('style.css');
  assert.match(style, /Theme Name:\s*E7 Propostas/);
  assert.match(style, /Text Domain:\s*e7-propostas/);
});

test('keeps the site header logo-only', async () => {
  const header = await read('header.php');
  const css = await read('src/input.css');

  assert.doesNotMatch(header, /Proposta privada|Private proposal|<span>/);
  assert.doesNotMatch(css, /\.header-inner span/);
});

test('uses the exact E7 brand palette and local fonts', async () => {
  const theme = JSON.parse(await read('theme.json'));
  const css = await read('assets/css/app.css');
  const colors = Object.fromEntries(theme.settings.color.palette.map(({ slug, color }) => [slug, color]));
  assert.equal(colors.brand, '#3b82f6');
  assert.equal(colors['brand-dark'], '#172554');
  assert.equal(colors.ink, '#0a0a0a');
  assert.match(css, /Inter Tight/);
  assert.match(css, /inter-latin\.woff2/);
});

test('matches the institutional black and blue visual palette', async () => {
  const proposalCss = await read('src/input.css');
  const institutionalCss = await read('../e7-company/src/input.css');
  const cover = proposalCss.match(/\.proposal-identity\{[^}]*\}/)?.[0] || '';

  assert.match(institutionalCss, /#0a0a0a/);
  assert.match(institutionalCss, /rgba\(23, 37, 84, 0\.5\)/);
  assert.match(institutionalCss, /#3b82f6/);
  assert.match(cover, /#0a0a0a/);
  assert.match(cover, /rgba\(23,37,84,/);
  assert.match(cover, /rgba\(59,130,246,/);
  assert.doesNotMatch(cover, /linear-gradient\(135deg,#172554 0%,#1e3a8a 62%,#2563eb 125%\)/);
});

test('keeps private information behind the password screen', async () => {
  const template = await read('proposal.php');
  assert.match(template, /screen.*password/);
  assert.match(template, /data-e7-password-form/);
  assert.match(template, /snapshot_html/);
  assert.match(template, /data-e7-acceptance-form/);
  assert.match(template, /autocomplete="one-time-code"/);
});

test('requires the proposal password without imposing a client-side minimum length', async () => {
  const template = await read('proposal.php');
  const passwordInput = template.match(/<input id="proposal-password"[^>]*>/)?.[0] || '';

  assert.match(passwordInput, /\brequired\b/);
  assert.doesNotMatch(passwordInput, /\bminlength=/);
});

test('renders a full-width proposal cover with issuer and recipient information', async () => {
  const template = await read('proposal.php');
  const header = await read('header.php');
  const css = await read('src/input.css');

  assert.match(template, /proposal-cover-logo/);
  assert.match(template, /href="<\?php echo esc_url\(\$main_site_url\); \?>" target="_blank" rel="noopener noreferrer"/);
  assert.match(template, /proposal-provider/);
  assert.match(template, /proposal-recipient/);
  assert.doesNotMatch(template, /proposal-provider[^\n]+client_email/);
  assert.match(template, /<time/);
  assert.match(template, /Proposto a/);
  assert.doesNotMatch(template, /PREPARADA PARA|PREPARED FOR/);
  assert.match(header, /screen[^\n]+proposal/);
  assert.match(css, /\.proposal-document-main\{[^}]*padding:0/);
  assert.match(css, /\.proposal-document\{[^}]*width:100%/);
  assert.match(css, /\.proposal-document\{[^}]*border:0/);
  assert.match(css, /\.proposal-document\{[^}]*box-shadow:none/);
});

test('shows the E7 legal entity and standard contact in the proposal cover', async () => {
  const template = await read('proposal.php');

  assert.match(template, /proposal-provider[^\n]+E7 Company Tecnologia LTDA\./);
  assert.doesNotMatch(template, /proposal-provider[^\n]+client_name/);
  assert.doesNotMatch(template, /proposal-provider[^\n]+client_email/);
  assert.match(template, /proposal-recipient[^\n]+Gabriel Carvalho[^\n]+gabriel\.carvalho@e7company\.com/);
});

test('addresses the proposal to the client name instead of the company', async () => {
  const template = await read('proposal.php');
  const proposedTo = template.match(/<div class="proposal-to"[^\n]+/)?.[0] || '';

  assert.match(proposedTo, /esc_html\(\$client_name\)/);
  assert.doesNotMatch(proposedTo, /client_company/);
});

test('labels the configured expiration date in Portuguese and English', async () => {
  const template = await read('proposal.php');

  assert.match(template, /version'\]\['expires_at/);
  assert.match(template, /Válido até/);
  assert.match(template, /Valid until/);
  assert.match(template, /<strong><\?php echo esc_html\(\$pt \? 'Válido até' : 'Valid until'\); \?><\/strong>/);
  assert.doesNotMatch(template, /version'\]\['created_at/);
  assert.doesNotMatch(template, /issued_date|issued_timestamp/);
});

test('aligns the visible proposal logo with the proposal title', async () => {
  const css = await read('src/input.css');

  assert.match(css, /\.proposal-cover-logo\{[^}]*transform:translateX\(-12\.5%\)/);
});

test('hides internal version and currency metadata from the proposal cover', async () => {
  const template = await read('proposal.php');
  const css = await read('src/input.css');

  assert.doesNotMatch(template, /document-meta/);
  assert.doesNotMatch(template, /Versão.*Version/);
  assert.doesNotMatch(template, /settings'\]\['currency/);
  assert.doesNotMatch(css, /\.document-meta/);
});

test('opens a clean four-step acceptance dialog from the proposal signature area', async () => {
  const template = await read('proposal.php');
  const script = await read('assets/js/proposal.js');
  const css = await read('src/input.css');

  assert.match(template, /proposal-signature/);
  assert.match(template, /data-e7-open-dialog/);
  assert.match(template, /<dialog[^>]+acceptance-dialog/);
  assert.equal((template.match(/data-e7-step=/g) || []).length, 4);
  assert.doesNotMatch(template, /data-e7-step="5"/);
  assert.doesNotMatch(template, /acceptance-card/);
  assert.match(script, /showModal\(\)/);
  assert.match(script, /data-e7-next-step/);
  assert.match(script, /data-e7-prev-step/);
  assert.match(script, /reportValidity\(\)/);
  assert.match(css, /\.acceptance-dialog::backdrop/);
  assert.match(css, /\.proposal-signature/);
});

test('collects both contacts with configured values locked before the signer chooses the OTP channel', async () => {
  const template = await read('proposal.php');
  const script = await read('assets/js/proposal.js');
  const functions = await read('functions.php');
  const packageJson = JSON.parse(await read('package.json'));

  assert.match(template, /name="otp_channel"[^>]+value="sms"/);
  assert.match(template, /name="otp_channel"[^>]+value="email"/);
  assert.match(template, /data-e7-phone-contact/);
  assert.match(template, /data-e7-email-contact/);
  assert.match(template, /name="otp_phone"[^>]+value="<\?php echo esc_attr\(\$client_phone\); \?>"/);
  assert.match(template, /name="otp_email"[^>]+value="<\?php echo esc_attr\(\$client_email\); \?>"/);
  assert.match(template, /\$client_phone !== '' \? 'readonly' : ''/);
  assert.match(template, /\$client_email !== '' \? 'readonly' : ''/);
  assert.match(template, /class="otp-method-list"/);
  assert.doesNotMatch(template, /otp-method-grid/);
  assert.match(template, />Método</);
  assert.match(template, />Código</);
  assert.doesNotMatch(template, />Contato</);
  assert.match(script, /channel:\s*selectedChannel/);
  assert.match(script, /destination:\s*selectedDestination/);
  assert.match(script, /email:\s*emailInput\.value/);
  assert.match(script, /phone:\s*normalizedPhone/);
  assert.match(script, /\/otp\/verify/);
  assert.match(script, /data-e7-resend-otp/);
  assert.match(functions, /intl-tel-input/);
  assert.ok(packageJson.dependencies['intl-tel-input']);
});

test('connects the signature area to the institutional design with friendly progress', async () => {
  const template = await read('proposal.php');
  const script = await read('assets/js/proposal.js');
  const css = await read('src/input.css');

  assert.match(template, /class="signature-inner"/);
  assert.match(template, /data-e7-progress/);
  assert.match(template, /role="progressbar"/);
  assert.match(template, /data-e7-progress-bar/);
  assert.match(template, />Dados</);
  assert.match(template, />Método</);
  assert.match(template, />Código</);
  assert.match(template, />Confirma(?:ç|&ccedil;)ão</);
  assert.doesNotMatch(template, />Contato</);
  assert.doesNotMatch(template, /Etapa 1 de 3|Step 1 of 3/);
  assert.match(script, /aria-valuenow/);
  assert.match(script, /progressBar\.style\.width/);
  assert.match(css, /--radius-ui:16px/);
  assert.match(css, /--radius-pill:999px/);
  assert.match(css, /\.proposal-signature\{[^}]*width:100%/);
  assert.match(css, /\.proposal-signature\{[^}]*background:#fafafa/);
  assert.match(css, /\.signature-heading h2\{[^}]*color:#0a0a0a/);
  assert.match(css, /\.signature-button\{[^}]*background:#2563eb/);
  assert.match(css, /\.signature-button\{[^}]*border-radius:var\(--radius-pill\)/);
  assert.match(css, /\.signature-button:hover\{[^}]*background:#3b82f6/);
  assert.match(css, /\.button-primary:hover\{[^}]*background:#3b82f6/);
  assert.match(css, /\.acceptance-dialog\{[^}]*border-radius:var\(--radius-ui\)/);
  assert.match(css, /input,select,textarea\{[^}]*border-radius:var\(--radius-ui\)/);
});

test('does not ask the signer for a role in either supported language', async () => {
  const template = await read('proposal.php');
  const script = await read('assets/js/proposal.js');

  assert.doesNotMatch(template, /name="role"/);
  assert.doesNotMatch(template, /'Cargo'\s*:\s*'Role'/);
  assert.doesNotMatch(script, /data\.get\('role'\)/);
  assert.match(script, /role:\s*''/);
});

test('publishes the proposal title without exposing client details in social metadata', async () => {
  const functions = await read('functions.php');
  assert.match(functions, /page_title/);
  assert.doesNotMatch(functions, /og:title" content="Private proposal/);
  assert.match(functions, /e7-propostas-social-preview\.jpg/);
  assert.doesNotMatch(functions, /client_name|snapshot_html|post_title/);
});

test('keeps a minimal legal footer without trust badges or certification claims', async () => {
  const footer = await read('footer.php');
  const css = await read('src/input.css');
  const packageJson = JSON.parse(await read('package.json'));

  assert.match(footer, /class="shell legal-row"/);
  assert.doesNotMatch(footer, /trust-grid|trust-item|trust-icon|\.svg/);
  assert.doesNotMatch(css, /\.trust-grid|\.trust-item|\.trust-icon/);
  assert.equal(packageJson.devDependencies['lucide-static'], undefined);
  assert.doesNotMatch(footer, /certificad[oa]|selo oficial|ICP-Brasil|eIDAS compliant/i);
  assert.match(css, /\.trust-footer\{[^}]*padding:24px 0/);
  assert.match(css, /\.legal-row\{[^}]*margin-top:0/);
});

test('uses cookie-backed REST workflow without browser storage', async () => {
  const script = await read('assets/js/proposal.js');
  assert.match(script, /credentials:\s*'same-origin'/);
  assert.match(script, /X-E7-CSRF/);
  assert.match(script, /Idempotency-Key/);
  assert.doesNotMatch(script, /localStorage|sessionStorage/);
});

test('has accessible focus, reduced motion and mobile safe area handling', async () => {
  const css = await read('assets/css/app.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /safe-area-inset-bottom/);
});

test('offers an authenticated final download and safe accessible completion UI', async () => {
  const template = await read('proposal.php');
  const script = await read('assets/js/proposal.js');
  const css = await read('src/input.css');
  assert.match(template, /download_url/);
  assert.match(script, /payload\.download_url/);
  assert.doesNotMatch(script, /innerHTML\s*=/);
  assert.match(script, /tabIndex\s*=\s*-1/);
  assert.match(script, /completion\.className\s*=\s*'gate-card completion'/);
  assert.match(script, /flow\.replaceChildren\(completion\)/);
  assert.match(css, /\.completion \.actions\{[^}]*justify-content:center/);
});

test('presents professional next steps in both completion paths and supported languages', async () => {
  const template = await read('proposal.php');
  const script = await read('assets/js/proposal.js');
  const css = await read('src/input.css');

  assert.match(template, /Proposta aceita com sucesso/);
  assert.match(template, /Proposal accepted successfully/);
  assert.match(template, /Próximos passos/);
  assert.match(template, /Next steps/);
  assert.match(script, /Proposta aceita com sucesso/);
  assert.match(script, /Proposal accepted successfully/);
  assert.match(script, /completion-summary/);
  assert.match(css, /\.completion-summary\{[^}]*background:#f6f8fb/);
});

test('keeps the confirmation checkbox free from a surrounding border', async () => {
  const css = await read('src/input.css');
  const consent = css.match(/\.consent\{[^}]*\}/)?.[0] || '';

  assert.match(consent, /border:0/);
  assert.doesNotMatch(consent, /border:1px/);
});

test('uses six accessible OTP boxes while preserving one six-digit value for the API', async () => {
  const template = await read('proposal.php');
  const script = await read('assets/js/proposal.js');
  const css = await read('src/input.css');

  assert.equal((template.match(/data-e7-otp-digit/g) || []).length, 6);
  assert.match(template, /<input name="otp" type="hidden"/);
  assert.doesNotMatch(template, /<input name="otp" inputmode="numeric"/);
  assert.match(template, /autocomplete="one-time-code"/);
  assert.match(template, /Dígito 1 de 6/);
  assert.match(template, /Digit 6 of 6/);
  assert.match(script, /const otpDigitInputs =/);
  assert.match(script, /clipboardData/);
  assert.match(script, /event\.key === 'Backspace'/);
  assert.match(script, /otpInput\.value = otpDigitInputs\.map/);
  assert.match(css, /\.otp-code-group\{[^}]*grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /\.otp-code-digit\{[^}]*text-align:center/);
});

test('reopens an accepted proposal with the same validation and download actions shown after signing', async () => {
  const template = await read('proposal.php');
  const script = await read('assets/js/proposal.js');

  assert.match(template, /\$verify_url\s*=\s*is_array\(\$acceptance\)/);
  assert.match(template, /home_url\('\/verify\/'/);
  assert.match(template, /class="button-secondary"[^>]*href="<\?php echo esc_url\(\$verify_url\); \?>"/);
  assert.match(template, /Validar documento' : 'Validate document/);
  assert.match(template, /Baixar cópia final' : 'Download final copy/);
  assert.match(script, /verify\.href = payload\.verify_url/);
  assert.match(script, /Validar documento/);
  assert.match(script, /Baixar cópia final/);
});

test('presents document validation as a clear professional summary with optional technical evidence', async () => {
  const template = await read('verify.php');
  const css = await read('src/input.css');

  assert.match(template, /class="verify-heading"/);
  assert.match(template, /Validação do documento/);
  assert.match(template, /Document validation/);
  assert.match(template, /Documento verificado/);
  assert.match(template, /Document verified/);
  assert.match(template, /class="verification-status/);
  assert.match(template, /<details class="verification-technical">/);
  assert.match(template, /Detalhes técnicos/);
  assert.match(template, /Technical details/);
  assert.match(template, /Aceito' : 'Accepted/);
  assert.doesNotMatch(template, /Cryptographic signature verified/);
  assert.match(css, /\.verify-card\{[^}]*width:min\(760px,100%\)/);
  assert.match(css, /\.verify-card h1\{[^}]*clamp\(34px,6vw,50px\)/);
});

test('localizes the private gate and client workflow in both supported languages', async () => {
  const template = await read('proposal.php');
  const script = await read('assets/js/proposal.js');
  assert.match(template, /data-locale/);
  assert.match(template, /Acesso privado/);
  assert.match(template, /Private access/);
  assert.match(template, /Senha' : 'Password/);
  assert.match(template, /Continuar' : 'Continue/);
  assert.doesNotMatch(template, /Proposal password|Open proposal/);
  assert.match(script, /en_IE/);
  assert.match(script, /Acceptance recorded/);
  assert.match(script, /localizedError/);
  assert.doesNotMatch(script, /status\.textContent\s*=\s*error\.message/);
  assert.match(template, /Proposal unavailable/);
});

test('preserves table headers and context on mobile', async () => {
  const css = await read('src/input.css');
  assert.doesNotMatch(css, /\.proposal-content thead\{display:none\}/);
  assert.match(css, /overflow-x:auto/);
});

test('keeps the proposal content introduction compact without changing later sections', async () => {
  const css = await read('src/input.css');

  assert.match(css, /\.proposal-content>h1:first-child\{[^}]*font-size:clamp\(24px,3vw,28px\)/);
  assert.match(css, /\.proposal-content>h1:first-child\+\.has-large-font-size\{[^}]*font-size:clamp\(18px,2\.2vw,22px\)!important/);
  assert.match(css, /\.proposal-content>h1:first-child\+\.has-large-font-size\{[^}]*line-height:1\.5/);
});

test('supports a deliberately smaller proposal lead paragraph', async () => {
  const css = await read('src/input.css');

  assert.match(css, /\.proposal-content \.e7-proposal-lead\{[^}]*font-size:clamp\(17px,1\.8vw,20px\)!important/);
  assert.match(css, /\.proposal-content \.e7-proposal-lead\{[^}]*line-height:1\.5/);
});

test('visually separates investment items from totals', async () => {
  const css = await read('src/input.css');

  assert.match(css, /\.e7-investment-table tbody tr:nth-last-child\(2\) td\{[^}]*border-top:2px solid var\(--ink\)/);
  assert.match(css, /\.e7-investment-table tbody tr:nth-last-child\(-n\+2\) td\{[^}]*background:#f6f8fb/);
  assert.match(css, /\.e7-investment-table tbody tr:nth-last-child\(-n\+2\) td\{[^}]*font-weight:700/);
});

test('renders a dedicated empty proposal state linked to the main E7 site', async () => {
  const template = await read('index.php');
  assert.match(template, /proposal-empty-state/);
  assert.match(template, /network_home_url\('\/'\)/);
  assert.match(template, /Visit E7 Company/);
  assert.doesNotMatch(template, /while \(have_posts\(\)\)/);
});

test('renders unavailable proposals with the same clean path back to the main E7 site', async () => {
  const template = await read('proposal.php');

  assert.match(template, /proposal-empty-main/);
  assert.match(template, /proposal-empty-state/);
  assert.match(template, /network_home_url\('\/'\)/);
  assert.match(template, /Visitar E7 Company/);
  assert.match(template, /Visit E7 Company/);
  assert.doesNotMatch(template, /<section class="gate-card"><h1><\?php echo esc_html\(\$pt \? 'Proposta indisponível'/);
});

test('keeps the empty proposal state directly on the page background', async () => {
  const css = await read('src/input.css');
  assert.match(css, /\.proposal-empty-state\{[^}]*background:transparent/);
  assert.match(css, /\.proposal-empty-state\{[^}]*border:0/);
  assert.match(css, /\.proposal-empty-state\{[^}]*box-shadow:none/);
});

test('keeps the password gate clean, centered and free of decorative branding', async () => {
  const template = await read('proposal.php');
  const css = await read('src/input.css');

  assert.match(template, /proposal-password-main/);
  assert.match(template, /proposal-password-gate/);
  assert.doesNotMatch(template, /gate-mark/);
  assert.doesNotMatch(template, />E7 COMPANY</);
  assert.match(css, /\.proposal-password-gate\{[^}]*background:transparent/);
  assert.match(css, /\.proposal-password-gate\{[^}]*border:0/);
  assert.match(css, /\.proposal-password-gate\{[^}]*box-shadow:none/);
  assert.match(css, /\.proposal-password-main\{[^}]*place-items:center/);
});

test('keeps legal page content outside the empty proposal landing page', async () => {
  const template = await read('page.php');
  assert.match(template, /the_content\(\)/);
  assert.match(template, /legal-page/);
});
