<?php
$view = e7_propostas_view();
$GLOBALS['view'] = $view;
get_header();
$screen = (string) ($view['screen'] ?? 'unavailable');
$locale = (string) ($view['locale'] ?? $view['settings']['locale'] ?? 'pt_BR');
$pt = $locale === 'pt_BR';
$acceptance = is_array($view['acceptance'] ?? null) ? $view['acceptance'] : null;
$otp_enabled = ($view['otp_enabled'] ?? true) === true;
$irish_invoice_flow = ($view['irish_invoice_flow'] ?? false) === true;
$step_labels = $irish_invoice_flow
    ? ($otp_enabled ? ['Responsible', 'Company', 'Billing & use', 'Code', 'Review'] : ['Responsible', 'Company', 'Billing & use', 'Review'])
    : ($otp_enabled ? ['Details', 'Code', 'Confirmation'] : ['Details', 'Confirmation']);
$download_url = is_array($acceptance) ? home_url('/download/' . $acceptance['acceptance']['public_id'] . '/') : '';
$verify_url = is_array($acceptance) ? home_url('/verify/' . $acceptance['acceptance']['public_id'] . '/') : '';
$issued_invoice = is_array($view['issued_invoice'] ?? null) ? $view['issued_invoice'] : null;
$invoice_download_url = is_array($issued_invoice) && ($issued_invoice['status'] ?? '') === 'issued'
    ? (string) ($view['invoice_download_url'] ?? '')
    : '';
$snapshot = json_decode((string) ($view['version']['snapshot_json'] ?? ''), true);
$metadata = is_array($snapshot) && is_array($snapshot['metadata'] ?? null) ? $snapshot['metadata'] : [];
$proposal_title = (string) ($metadata['title'] ?? ($pt ? 'Proposta comercial' : 'Commercial proposal'));
$valid_until_raw = (string) ($view['version']['expires_at'] ?? '');
$valid_until_timestamp = $valid_until_raw === '' ? false : strtotime($valid_until_raw . ' UTC');
$valid_until_date = $valid_until_timestamp === false ? '' : wp_date('d/m/Y', $valid_until_timestamp);
$client_name = (string) ($view['settings']['client_name'] ?? '');
$client_company = (string) ($view['settings']['client_company'] ?? '');
$client_email = (string) ($view['settings']['client_email'] ?? '');
$client_phone = (string) ($view['settings']['client_phone'] ?? '');
$accepted_signer_name = is_array($acceptance) ? (string) ($acceptance['acceptance']['signer_name'] ?? $client_name) : '';
$accepted_signer_email = is_array($acceptance) ? (string) ($acceptance['acceptance']['signer_email'] ?? $client_email) : '';
$main_site_url = network_home_url('/');
?>
<main id="main-content" class="proposal-main<?php echo $screen === 'password' ? ' proposal-password-main' : ($screen === 'proposal' ? ' proposal-document-main' : ($screen === 'unavailable' ? ' proposal-empty-main' : '')); ?>">
<?php if ($screen === 'password') : ?>
    <section class="proposal-password-gate" aria-labelledby="gate-title">
        <h1 id="gate-title"><?php echo esc_html($pt ? 'Acesso privado' : 'Private access'); ?></h1>
        <p><?php echo esc_html($pt ? 'Digite a senha compartilhada pela E7 para visualizar este conteúdo.' : 'Enter the password shared by E7 to view this content.'); ?></p>
        <form data-e7-password-form data-locale="<?php echo esc_attr($locale); ?>" data-rest-url="<?php echo esc_url($view['rest_url']); ?>" data-code="<?php echo esc_attr($view['code']); ?>">
            <label for="proposal-password"><?php echo esc_html($pt ? 'Senha' : 'Password'); ?></label>
            <input id="proposal-password" name="password" type="password" autocomplete="current-password" required>
            <button class="button-primary" type="submit"><?php echo esc_html($pt ? 'Continuar' : 'Continue'); ?></button>
            <p class="form-status" data-e7-status role="status" aria-live="polite"></p>
        </form>
    </section>
<?php elseif ($screen === 'proposal') : ?>
    <article class="proposal-document">
        <header class="proposal-identity">
            <div class="proposal-cover-inner">
                <div class="proposal-cover-top">
                    <a href="<?php echo esc_url($main_site_url); ?>" target="_blank" rel="noopener noreferrer" aria-label="<?php echo esc_attr($pt ? 'Visitar o site da E7 Company' : 'Visit the E7 Company website'); ?>"><img class="proposal-cover-logo" src="<?php echo esc_url(get_template_directory_uri() . '/assets/brand/e7-company-logo-transparent-256.webp'); ?>" width="256" height="119" alt="E7 Company"></a>
                    <div class="proposal-provider"><span aria-hidden="true"></span><strong>E7 Company Tecnologia LTDA.</strong></div>
                    <div class="proposal-recipient"><span aria-hidden="true"></span><strong>Gabriel Carvalho</strong><small>gabriel.carvalho@e7company.com</small></div>
                </div>
                <div class="proposal-cover-details"><div>
                    <h1><?php echo esc_html($proposal_title); ?></h1>
                    <?php if ($valid_until_date !== '') : ?><time datetime="<?php echo esc_attr(gmdate('Y-m-d', $valid_until_timestamp)); ?>"><strong><?php echo esc_html($pt ? 'Válido até' : 'Valid until'); ?></strong> <?php echo esc_html($valid_until_date); ?></time><?php endif; ?>
                </div></div>
                <div class="proposal-to"><span aria-hidden="true"></span><small><?php echo esc_html($pt ? 'Proposto a' : 'Proposed to'); ?></small><strong><?php echo esc_html($client_name); ?></strong></div>
            </div>
        </header>
        <div class="proposal-content"><?php echo wp_kses_post((string) $view['version']['snapshot_html']); ?></div>
        <section class="proposal-signature" aria-labelledby="acceptance-title"<?php if (! is_array($acceptance)) : ?> data-e7-flow data-e7-otp-enabled="<?php echo $otp_enabled ? '1' : '0'; ?>" data-e7-irish-flow="<?php echo $irish_invoice_flow ? '1' : '0'; ?>" data-locale="<?php echo esc_attr($locale); ?>" data-rest-url="<?php echo esc_url($view['rest_url']); ?>" data-csrf="<?php echo esc_attr($view['csrf']); ?>"<?php endif; ?>>
        <?php if (is_array($acceptance)) : ?>
            <div class="signature-inner signature-complete">
                <div class="signature-heading">
                    <h2 id="acceptance-title"><?php echo esc_html($pt ? 'Assinatura' : 'Signature'); ?></h2>
                    <p><?php echo esc_html($pt ? 'Esta proposta foi aceita e registrada com segurança.' : 'This proposal has been securely accepted and recorded.'); ?></p>
                </div>
                <div class="signer-row">
                    <div class="signer-info"><strong><?php echo esc_html($accepted_signer_name); ?></strong><?php if ($accepted_signer_email !== '') : ?><span><?php echo esc_html($accepted_signer_email); ?></span><?php endif; ?></div>
                    <?php if ($verify_url !== '' && $download_url !== '') : ?>
                    <div class="signer-actions">
                        <a class="button-secondary" href="<?php echo esc_url($verify_url); ?>"><?php echo esc_html($pt ? 'Validar documento' : 'Validate document'); ?></a>
                        <a class="button-primary" href="<?php echo esc_url($download_url); ?>"><?php echo esc_html($pt ? 'Baixar cópia final' : 'Download final copy'); ?></a>
                        <?php if ($invoice_download_url !== '') : ?><a class="button-primary" href="<?php echo esc_url($invoice_download_url); ?>"><?php echo esc_html($pt ? 'Baixar fatura' : 'Download invoice'); ?></a><?php endif; ?>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        <?php else : ?>
            <div class="signature-inner">
                <div class="signature-heading">
                    <h2 id="acceptance-title"><?php echo esc_html($pt ? 'Assinatura' : 'Signature'); ?></h2>
                    <p><?php echo esc_html($otp_enabled
                        ? ($pt ? 'Para aceitar esta proposta, confirme seus dados e sua identidade com um código de uso único.' : 'To accept this proposal, confirm your details and identity with a one-time code.')
                        : ($pt ? 'Para aceitar esta proposta, confirme seus dados e revise as informações.' : 'To accept this proposal, confirm your details and review the information.')); ?></p>
                </div>
                <div class="signer-row">
                    <div class="signer-info"><strong><?php echo esc_html($client_name); ?></strong><?php if ($client_email !== '') : ?><span><?php echo esc_html($client_email); ?></span><?php endif; ?></div>
                    <button class="signature-button" type="button" data-e7-open-dialog><?php echo esc_html($pt ? 'Assinar proposta' : 'Sign proposal'); ?></button>
                </div>
                <dialog class="acceptance-dialog<?php echo $irish_invoice_flow ? ' acceptance-dialog-wide' : ''; ?>" aria-label="<?php echo esc_attr($pt ? 'Aceite eletrônico' : 'Electronic acceptance'); ?>" data-e7-dialog>
                    <div class="dialog-shell">
                        <button class="dialog-close" type="button" data-e7-close-dialog aria-label="<?php echo esc_attr($pt ? 'Fechar' : 'Close'); ?>">×</button>
                        <div class="dialog-progress" role="progressbar" aria-label="<?php echo esc_attr($pt ? 'Progresso do aceite' : 'Acceptance progress'); ?>" aria-valuemin="1" aria-valuemax="<?php echo count($step_labels); ?>" aria-valuenow="1" aria-valuetext="<?php echo esc_attr($step_labels[0]); ?>" data-e7-progress>
                            <div class="dialog-progress-track" aria-hidden="true"><span data-e7-progress-bar></span></div>
                            <div class="dialog-progress-labels" aria-hidden="true"><?php foreach ($step_labels as $index => $label) : ?><span<?php echo $index === 0 ? ' class="is-active"' : ''; ?>><?php echo esc_html($label); ?></span><?php endforeach; ?></div>
                        </div>
                        <form data-e7-acceptance-form novalidate>
                        <section class="dialog-step" data-e7-step="1" data-e7-step-kind="details">
                            <h2 tabindex="-1"><?php echo esc_html($irish_invoice_flow ? 'Responsible' : ($pt ? 'Confirme seus dados' : 'Confirm your details')); ?></h2>
                            <p><?php echo esc_html($irish_invoice_flow ? 'Enter the details of the person responsible for accepting this proposal.' : ($pt ? 'Informe os dados de quem aceitará a proposta.' : 'Enter the details of the person accepting the proposal.')); ?></p>
                            <div class="dialog-fields field-grid">
                                <label><?php echo esc_html($pt ? 'Nome completo' : 'Full name'); ?><input name="name" autocomplete="name" value="<?php echo esc_attr($client_name); ?>" required></label>
                                <?php if ($irish_invoice_flow) : ?><label>Job title<input name="responsible_role" autocomplete="organization-title" required></label><?php endif; ?>
                                <label><?php echo esc_html($pt ? 'E-mail' : 'Email'); ?><input id="e7-otp-email" name="email" type="email" autocomplete="email" value="<?php echo esc_attr($client_email); ?>" required></label>
                                <label><?php echo esc_html($pt ? 'Telefone internacional' : 'International phone'); ?><input class="e7-phone-input" name="phone" type="tel" autocomplete="tel" value="<?php echo esc_attr($client_phone); ?>"<?php echo ($irish_invoice_flow || ! $otp_enabled) ? ' required' : ''; ?>></label>
                                <?php if (! $irish_invoice_flow) : ?><label class="field-span"><?php echo esc_html($pt ? 'Empresa (opcional)' : 'Company (optional)'); ?><input name="company" autocomplete="organization" value="<?php echo esc_attr($client_company); ?>"></label><?php endif; ?>
                            </div>
                        </section>
                        <?php if ($irish_invoice_flow) : ?>
                        <section class="dialog-step" data-e7-step="2" data-e7-step-kind="company" hidden>
                            <h2 tabindex="-1">Company</h2><p>Provide the legal and registered details used for invoicing.</p>
                            <div class="dialog-fields field-grid">
                                <label>Business type<select name="business_type" required><option value="company">Company</option><option value="sole_trader">Sole trader</option></select></label>
                                <label>Legal name<input name="legal_name" autocomplete="organization" value="<?php echo esc_attr($client_company); ?>" required></label>
                                <label>Trading name <span class="optional">Optional</span><input name="trading_name"></label>
                                <label>Registration number<input name="registration_number" inputmode="numeric" maxlength="8" required></label>
                                <label class="check-row field-span"><input name="vat_registered" type="checkbox"><span>VAT registered in Ireland</span></label>
                                <div class="field-span" data-e7-vat-fields hidden><label>Irish VAT number<input name="vat_number" autocomplete="off" placeholder="IE1234567A"></label></div>
                                <div class="field-span subsection-heading"><h3>Registered address</h3></div>
                                <label class="field-span">Address line 1<input name="registered_line1" autocomplete="address-line1" required></label>
                                <label class="field-span">Address line 2 <span class="optional">Optional</span><input name="registered_line2" autocomplete="address-line2"></label>
                                <label>City<input name="registered_city" autocomplete="address-level2" required></label>
                                <label>County <span class="optional">Optional</span><input name="registered_county" autocomplete="address-level1"></label>
                                <label>Eircode<input name="registered_eircode" autocomplete="postal-code" required></label>
                                <label>Country<input value="Ireland" readonly><input name="registered_country_code" type="hidden" value="IE"></label>
                            </div>
                        </section>
                        <section class="dialog-step" data-e7-step="3" data-e7-step-kind="billing" hidden>
                            <h2 tabindex="-1">Billing &amp; use</h2><p>Add only the billing and service details that apply.</p>
                            <div class="dialog-fields field-grid">
                                <label>Finance email <span class="optional">Optional</span><input name="finance_email" type="email" autocomplete="email"></label>
                                <label>Purchase order <span class="optional">Optional</span><input name="purchase_order"></label>
                                <label class="check-row field-span"><input name="billing_same_as_registered" type="checkbox" checked><span>Billing address is the same as the registered address</span></label>
                                <div class="conditional-fields field-span" data-e7-billing-address hidden>
                                    <h3>Billing address</h3><div class="field-grid">
                                    <label class="field-span">Address line 1<input name="billing_line1" autocomplete="billing address-line1"></label>
                                    <label class="field-span">Address line 2 <span class="optional">Optional</span><input name="billing_line2" autocomplete="billing address-line2"></label>
                                    <label>City<input name="billing_city" autocomplete="billing address-level2"></label>
                                    <label>County <span class="optional">Optional</span><input name="billing_county" autocomplete="billing address-level1"></label>
                                    <label>Eircode<input name="billing_eircode" autocomplete="billing postal-code"></label>
                                    <label>Country<input value="Ireland" readonly><input name="billing_country_code" type="hidden" value="IE"></label>
                                    </div>
                                </div>
                                <label class="check-row field-span"><input name="payer_same_as_business" type="checkbox" checked><span>The payer is the business named above</span></label>
                                <div class="field-span" data-e7-payer-fields hidden><label>Payer legal name<input name="payer_legal_name"></label></div>
                                <label>Service city<input name="service_city" required></label>
                                <label>Website domain <span class="optional">Optional</span><input name="domain" inputmode="url" placeholder="example.ie"></label>
                                <label class="field-span">WhatsApp <span class="optional">Optional</span><input class="e7-phone-input" name="whatsapp" type="tel" autocomplete="tel"></label>
                            </div>
                        </section>
                        <?php endif; ?>
                        <?php if ($otp_enabled) : ?>
                        <section class="dialog-step" data-e7-step="<?php echo $irish_invoice_flow ? 4 : 2; ?>" data-e7-step-kind="code" hidden>
                            <h2 tabindex="-1"><?php echo esc_html($pt ? 'Informe o código' : 'Enter the code'); ?></h2>
                            <p class="otp-sent-to"><?php echo esc_html($pt ? 'Enviamos um código de seis dígitos para' : 'We sent a six-digit code to'); ?> <strong data-e7-masked-destination></strong>.</p>
                            <fieldset class="otp-code-fieldset"><legend><?php echo esc_html($pt ? 'Código de 6 dígitos' : '6-digit code'); ?></legend>
                                <div class="otp-code-group" data-e7-otp-code>
                                <?php for ($digit = 1; $digit <= 6; $digit++) : ?><input class="otp-code-digit" data-e7-otp-digit type="text" inputmode="numeric" pattern="[0-9]" maxlength="1"<?php echo $digit === 1 ? ' autocomplete="one-time-code"' : ''; ?> enterkeyhint="<?php echo $digit === 6 ? 'done' : 'next'; ?>" aria-label="<?php echo esc_attr($pt ? "Dígito {$digit} de 6" : "Digit {$digit} of 6"); ?>" required><?php endfor; ?>
                                </div><input name="otp" type="hidden">
                            </fieldset>
                            <button class="otp-resend" type="button" data-e7-resend-otp><?php echo esc_html($pt ? 'Reenviar código' : 'Resend code'); ?></button>
                        </section>
                        <?php endif; ?>
                        <section class="dialog-step" data-e7-step="<?php echo count($step_labels); ?>" data-e7-step-kind="review" hidden>
                            <h2 tabindex="-1"><?php echo esc_html($irish_invoice_flow ? 'Review' : ($pt ? 'Revise e aceite' : 'Review and accept')); ?></h2>
                            <p><?php echo esc_html($irish_invoice_flow ? 'Check the details below before accepting the proposal.' : ($pt ? 'Confirme que leu o conteúdo antes de concluir.' : 'Confirm that you have read the content before completing.')); ?></p>
                            <?php if ($irish_invoice_flow) : ?>
                                <dl class="review-summary" data-e7-review-summary></dl>
                                <div class="review-confirmations">
                                    <label class="consent"><input name="confirmation_b2b" type="checkbox" required><span>I confirm this is a business-to-business purchase.</span></label>
                                    <label class="consent"><input name="confirmation_ireland" type="checkbox" required><span>I confirm the customer and service details relate to Ireland.</span></label>
                                    <label class="consent"><input name="confirmation_accuracy" type="checkbox" required><span>I confirm the business and billing information is accurate.</span></label>
                                </div>
                            <?php endif; ?>
                            <label class="consent"><input name="consent" type="checkbox" required><span><?php echo esc_html($pt ? 'Li e aceito esta proposta e concordo com o uso de registros e assinaturas eletrônicas.' : 'I have read and accept this proposal and agree to the use of electronic records and signatures.'); ?></span></label>
                        </section>
                        <p class="form-status" data-e7-status role="status" aria-live="polite"></p>
                        <div class="dialog-actions"><button class="button-secondary" type="button" data-e7-prev-step hidden><?php echo esc_html($pt ? 'Voltar' : 'Back'); ?></button><button class="button-primary" type="button" data-e7-next-step><?php echo esc_html($pt ? 'Continuar' : 'Continue'); ?></button><button class="button-primary" type="submit" hidden><?php echo esc_html($pt ? 'Aceitar proposta' : 'Accept proposal'); ?></button></div>
                        </form>
                    </div>
                </dialog>
            </div>
        <?php endif; ?>
        </section>
    </article>
<?php else : ?>
    <section class="proposal-empty-state" aria-labelledby="proposal-unavailable-title">
        <h1 id="proposal-unavailable-title"><?php echo esc_html($pt ? 'Proposta indisponível' : 'Proposal unavailable'); ?></h1>
        <p><?php echo esc_html($pt ? 'Confira o link recebido. Se você estava procurando nosso site, continue abaixo.' : 'Check the link you received. If you were looking for our website, continue below.'); ?></p>
        <a class="button-primary" href="<?php echo esc_url($main_site_url); ?>"><?php echo esc_html($pt ? 'Visitar E7 Company' : 'Visit E7 Company'); ?></a>
    </section>
<?php endif; ?>
</main>
<?php get_footer(); ?>
