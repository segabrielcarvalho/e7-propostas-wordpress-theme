<?php
$view = e7_propostas_view();
$GLOBALS['view'] = $view;
$record = $view['record'] ?? null;
$pt = ($view['locale'] ?? 'pt_BR') === 'pt_BR';
$signatureVerified = ($view['signature_verified'] ?? false) === true;
$acceptedAt = '';
if (is_array($record)) {
    $acceptedAtRaw = (string) ($record['acceptance']['accepted_at'] ?? '');
    try {
        $acceptedAt = $acceptedAtRaw === '' ? '' : (new DateTimeImmutable($acceptedAtRaw, new DateTimeZone('UTC')))->format($pt ? 'd/m/Y H:i' : 'd M Y, H:i');
    } catch (Throwable) {
        $acceptedAt = $acceptedAtRaw;
    }
}
get_header();
?>
<main id="main-content" class="proposal-main">
    <section class="verify-card">
        <?php if (! is_array($record)) : ?>
            <header class="verify-heading verification-empty">
                <div class="verification-mark is-error" aria-hidden="true">!</div>
                <p class="eyebrow"><?php echo esc_html($pt ? 'Validação do documento' : 'Document validation'); ?></p>
                <h1><?php echo esc_html($pt ? 'Documento não encontrado' : 'Document not found'); ?></h1>
                <p class="verify-lead"><?php echo esc_html($pt ? 'Não localizamos um registro com este código. Confira o endereço recebido e tente novamente.' : 'We could not find a record for this code. Check the address you received and try again.'); ?></p>
            </header>
        <?php else : ?>
            <header class="verify-heading">
                <div class="success-mark" aria-hidden="true">✓</div>
                <p class="eyebrow"><?php echo esc_html($pt ? 'Validação do documento' : 'Document validation'); ?></p>
                <h1><?php echo esc_html($signatureVerified ? ($pt ? 'Documento verificado' : 'Document verified') : ($pt ? 'Registro localizado' : 'Record found')); ?></h1>
                <p class="verify-lead"><?php echo esc_html($signatureVerified ? ($pt ? 'A assinatura criptográfica da cópia final foi verificada com sucesso. Os dados abaixo correspondem ao registro de aceite armazenado pela E7 Company.' : 'The final copy’s cryptographic signature has been verified successfully. The details below match the acceptance record held by E7 Company.') : ($pt ? 'O registro de aceite foi localizado, mas a assinatura criptográfica da cópia final não pôde ser verificada neste ambiente.' : 'The acceptance record was found, but the final copy’s cryptographic signature could not be verified in this environment.')); ?></p>
                <div class="verification-status <?php echo $signatureVerified ? 'is-verified' : 'is-limited'; ?>">
                    <span aria-hidden="true"></span>
                    <?php echo esc_html($signatureVerified ? ($pt ? 'Assinatura criptográfica válida' : 'Cryptographic signature valid') : ($pt ? 'Verificação criptográfica indisponível' : 'Cryptographic verification unavailable')); ?>
                </div>
            </header>

            <section aria-labelledby="verification-summary-title">
                <h2 class="verify-section-title" id="verification-summary-title"><?php echo esc_html($pt ? 'Resumo do aceite' : 'Acceptance summary'); ?></h2>
                <dl class="verify-list verify-list-summary">
                    <div><dt><?php echo esc_html($pt ? 'Documento' : 'Document'); ?></dt><dd><code><?php echo esc_html((string) $record['acceptance']['public_id']); ?></code></dd></div>
                    <div><dt><?php echo esc_html($pt ? 'Versão' : 'Version'); ?></dt><dd><?php echo (int) $record['version']['version_no']; ?></dd></div>
                    <div><dt>Status</dt><dd><?php echo esc_html($pt ? 'Aceito' : 'Accepted'); ?></dd></div>
                    <div><dt><?php echo esc_html($pt ? 'Aceito em' : 'Accepted at'); ?></dt><dd><?php echo esc_html($acceptedAt); ?> UTC</dd></div>
                </dl>
            </section>

            <details class="verification-technical">
                <summary><?php echo esc_html($pt ? 'Detalhes técnicos' : 'Technical details'); ?></summary>
                <p class="verification-technical-intro"><?php echo esc_html($pt ? 'Estas informações permitem conferir a integridade da proposta e da cópia final.' : 'This information can be used to check the integrity of the proposal and its final copy.'); ?></p>
                <dl class="verify-list">
                    <div><dt>Document SHA-256</dt><dd class="hash"><code><?php echo esc_html((string) $record['version']['document_hash']); ?></code></dd></div>
                    <div><dt>Artifact SHA-256</dt><dd class="hash"><code><?php echo esc_html((string) ($record['version']['artifact_hash'] ?: ($pt ? 'Processando' : 'Processing'))); ?></code></dd></div>
                    <div><dt><?php echo esc_html($pt ? 'Assinatura criptográfica' : 'Cryptographic signature'); ?></dt><dd><?php echo esc_html($signatureVerified ? ($pt ? 'Verificada' : 'Verified') : ($pt ? 'Não verificada neste ambiente' : 'Not verified in this environment')); ?></dd></div>
                    <div><dt><?php echo esc_html($pt ? 'Cópia final' : 'Final copy'); ?></dt><dd><?php echo esc_html(empty($record['version']['artifact_key']) ? ($pt ? 'Processando' : 'Processing') : ($pt ? 'Pronta' : 'Ready')); ?></dd></div>
                </dl>
            </details>
        <?php endif; ?>
    </section>
</main>
<?php get_footer(); ?>
