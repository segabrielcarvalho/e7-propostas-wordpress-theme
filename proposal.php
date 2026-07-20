<?php
$view = e7_propostas_view();
$GLOBALS['view'] = $view;
get_header();
$screen = (string) ($view['screen'] ?? 'unavailable');
$locale = (string) ($view['locale'] ?? $view['settings']['locale'] ?? 'pt_BR');
$pt = $locale === 'pt_BR';
$acceptance = is_array($view['acceptance'] ?? null) ? $view['acceptance'] : null;
$download_url = is_array($acceptance) ? home_url('/download/' . $acceptance['acceptance']['public_id'] . '/') : '';
$verify_url = is_array($acceptance) ? home_url('/verify/' . $acceptance['acceptance']['public_id'] . '/') : '';
$snapshot = json_decode((string) ($view['version']['snapshot_json'] ?? ''), true);
$metadata = is_array($snapshot) && is_array($snapshot['metadata'] ?? null) ? $snapshot['metadata'] : [];
$proposal_title = (string) ($metadata['title'] ?? ($pt ? 'Proposta comercial' : 'Commercial proposal'));
$valid_until_raw = (string) ($view['version']['expires_at'] ?? '');
$valid_until_timestamp = $valid_until_raw === '' ? false : strtotime($valid_until_raw . ' UTC');
$valid_until_date = $valid_until_timestamp === false ? '' : wp_date('d/m/Y', $valid_until_timestamp);
$client_name = (string) ($view['settings']['client_name'] ?? '');
$client_company = (string) ($view['settings']['client_company'] ?? '');
$client_email = (string) ($view['settings']['client_email'] ?? '');
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
                <div class="proposal-cover-details">
                    <div>
                        <h1><?php echo esc_html($proposal_title); ?></h1>
                        <?php if ($valid_until_date !== '') : ?><time datetime="<?php echo esc_attr(gmdate('Y-m-d', $valid_until_timestamp)); ?>"><strong><?php echo esc_html($pt ? 'Válido até' : 'Valid until'); ?></strong> <?php echo esc_html($valid_until_date); ?></time><?php endif; ?>
                    </div>
                </div>
                <div class="proposal-to"><span aria-hidden="true"></span><small><?php echo esc_html($pt ? 'Proposto a' : 'Proposed to'); ?></small><strong><?php echo esc_html($client_name); ?></strong></div>
            </div>
        </header>
        <div class="proposal-content"><?php echo wp_kses_post((string) $view['version']['snapshot_html']); ?></div>
        <section class="proposal-signature" aria-labelledby="acceptance-title"<?php if (! is_array($acceptance)) : ?> data-e7-flow data-locale="<?php echo esc_attr($locale); ?>" data-rest-url="<?php echo esc_url($view['rest_url']); ?>" data-csrf="<?php echo esc_attr($view['csrf']); ?>"<?php endif; ?>>
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
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        <?php else : ?>
            <div class="signature-inner">
                <div class="signature-heading">
                    <h2 id="acceptance-title"><?php echo esc_html($pt ? 'Assinatura' : 'Signature'); ?></h2>
                    <p><?php echo esc_html($pt ? 'Para aceitar esta proposta, confirme seus dados e sua identidade com um código de uso único.' : 'To accept this proposal, confirm your details and identity with a one-time code.'); ?></p>
                </div>
                <div class="signer-row">
                    <div class="signer-info"><strong><?php echo esc_html($client_name); ?></strong><?php if ($client_email !== '') : ?><span><?php echo esc_html($client_email); ?></span><?php endif; ?></div>
                    <button class="signature-button" type="button" data-e7-open-dialog><?php echo esc_html($pt ? 'Assinar proposta' : 'Sign proposal'); ?></button>
                </div>
                <dialog class="acceptance-dialog" aria-label="<?php echo esc_attr($pt ? 'Aceite eletrônico' : 'Electronic acceptance'); ?>" data-e7-dialog>
                    <div class="dialog-shell">
                        <button class="dialog-close" type="button" data-e7-close-dialog aria-label="<?php echo esc_attr($pt ? 'Fechar' : 'Close'); ?>">×</button>
                        <div class="dialog-progress" role="progressbar" aria-label="<?php echo esc_attr($pt ? 'Progresso do aceite' : 'Acceptance progress'); ?>" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1" aria-valuetext="<?php echo esc_attr($pt ? 'Dados' : 'Details'); ?>" data-e7-progress>
                            <div class="dialog-progress-track" aria-hidden="true"><span data-e7-progress-bar></span></div>
                            <div class="dialog-progress-labels" aria-hidden="true">
                                <?php if ($pt) : ?><span class="is-active">Dados</span><span>Código</span><span>Confirmação</span><?php else : ?><span class="is-active">Details</span><span>Code</span><span>Confirmation</span><?php endif; ?>
                            </div>
                        </div>
                        <form data-e7-acceptance-form>
                        <section class="dialog-step" data-e7-step="1">
                            <h2><?php echo esc_html($pt ? 'Confirme seus dados' : 'Confirm your details'); ?></h2>
                            <p><?php echo esc_html($pt ? 'Informe os dados de quem aceitará a proposta.' : 'Enter the details of the person accepting the proposal.'); ?></p>
                            <div class="dialog-fields">
                                <label><?php echo esc_html($pt ? 'Nome completo' : 'Full name'); ?><input name="name" autocomplete="name" value="<?php echo esc_attr($client_name); ?>" required></label>
                                <label><?php echo esc_html($pt ? 'Empresa' : 'Company'); ?><input name="company" autocomplete="organization" value="<?php echo esc_attr($client_company); ?>"></label>
                                <div data-e7-email-contact>
                                    <label for="e7-otp-email"><?php echo esc_html($pt ? 'E-mail' : 'Email'); ?></label>
                                    <input id="e7-otp-email" name="otp_email" type="email" autocomplete="email" value="<?php echo esc_attr($client_email); ?>" <?php echo $client_email !== '' ? 'readonly' : ''; ?> required>
                                </div>
                            </div>
                        </section>
                        <section class="dialog-step" data-e7-step="2" hidden>
                            <h2><?php echo esc_html($pt ? 'Informe o código' : 'Enter the code'); ?></h2>
                            <p class="otp-sent-to"><?php echo esc_html($pt ? 'Enviamos um código de seis dígitos para' : 'We sent a six-digit code to'); ?> <strong data-e7-masked-destination></strong>.</p>
                            <fieldset class="otp-code-fieldset">
                                <legend><?php echo esc_html($pt ? 'Código de 6 dígitos' : '6-digit code'); ?></legend>
                                <div class="otp-code-group" data-e7-otp-code>
                                    <input class="otp-code-digit" data-e7-otp-digit type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" autocomplete="one-time-code" enterkeyhint="next" aria-label="<?php echo esc_attr($pt ? 'Dígito 1 de 6' : 'Digit 1 of 6'); ?>" required>
                                    <input class="otp-code-digit" data-e7-otp-digit type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" enterkeyhint="next" aria-label="<?php echo esc_attr($pt ? 'Dígito 2 de 6' : 'Digit 2 of 6'); ?>" required>
                                    <input class="otp-code-digit" data-e7-otp-digit type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" enterkeyhint="next" aria-label="<?php echo esc_attr($pt ? 'Dígito 3 de 6' : 'Digit 3 of 6'); ?>" required>
                                    <input class="otp-code-digit" data-e7-otp-digit type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" enterkeyhint="next" aria-label="<?php echo esc_attr($pt ? 'Dígito 4 de 6' : 'Digit 4 of 6'); ?>" required>
                                    <input class="otp-code-digit" data-e7-otp-digit type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" enterkeyhint="next" aria-label="<?php echo esc_attr($pt ? 'Dígito 5 de 6' : 'Digit 5 of 6'); ?>" required>
                                    <input class="otp-code-digit" data-e7-otp-digit type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" enterkeyhint="done" aria-label="<?php echo esc_attr($pt ? 'Dígito 6 de 6' : 'Digit 6 of 6'); ?>" required>
                                </div>
                                <input name="otp" type="hidden">
                            </fieldset>
                            <button class="otp-resend" type="button" data-e7-resend-otp><?php echo esc_html($pt ? 'Reenviar código' : 'Resend code'); ?></button>
                        </section>
                        <section class="dialog-step" data-e7-step="3" hidden>
                            <h2><?php echo esc_html($pt ? 'Revise e aceite' : 'Review and accept'); ?></h2>
                            <p><?php echo esc_html($pt ? 'Confirme que leu o conteúdo antes de concluir.' : 'Confirm that you have read the content before completing.'); ?></p>
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
