<?php
$view = e7_propostas_view();
$GLOBALS['view'] = $view;
$record = $view['record'] ?? null;
$pt = ($view['locale'] ?? 'pt_BR') === 'pt_BR';
$signatureVerified = ($view['signature_verified'] ?? false) === true;
get_header();
?>
<main id="main-content" class="proposal-main"><section class="verify-card">
    <?php if (! is_array($record)) : ?><h1><?php echo esc_html($pt ? 'Documento não encontrado' : 'Document not found'); ?></h1><p><?php echo esc_html($pt ? 'Confira o código de validação.' : 'Check the validation code.'); ?></p>
    <?php else : ?><div class="success-mark" aria-hidden="true">✓</div><p class="eyebrow">E7 COMPANY</p><h1><?php echo esc_html($signatureVerified ? ($pt ? 'Assinatura criptográfica verificada' : 'Cryptographic signature verified') : ($pt ? 'Registro de integridade localizado' : 'Integrity record found')); ?></h1><dl class="verify-list"><div><dt><?php echo esc_html($pt ? 'Documento' : 'Document'); ?></dt><dd><?php echo esc_html((string) $record['acceptance']['public_id']); ?></dd></div><div><dt><?php echo esc_html($pt ? 'Versão' : 'Version'); ?></dt><dd><?php echo (int) $record['version']['version_no']; ?></dd></div><div><dt>Status</dt><dd>Accepted</dd></div><div><dt><?php echo esc_html($pt ? 'Aceito em' : 'Accepted at'); ?></dt><dd><?php echo esc_html((string) $record['acceptance']['accepted_at']); ?> UTC</dd></div><div><dt>Document SHA-256</dt><dd class="hash"><?php echo esc_html((string) $record['version']['document_hash']); ?></dd></div><div><dt>Artifact SHA-256</dt><dd class="hash"><?php echo esc_html((string) ($record['version']['artifact_hash'] ?: ($pt ? 'Processando' : 'Processing'))); ?></dd></div><div><dt>KMS</dt><dd><?php echo esc_html($signatureVerified ? 'Verified' : ($pt ? 'Não verificada neste ambiente' : 'Not verified in this environment')); ?></dd></div><div><dt><?php echo esc_html($pt ? 'Arquivo final' : 'Final artifact'); ?></dt><dd><?php echo esc_html(empty($record['version']['artifact_key']) ? 'Processing' : 'Ready'); ?></dd></div></dl><?php endif; ?>
</section></main>
<?php get_footer(); ?>
