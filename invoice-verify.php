<?php
$view = e7_propostas_view();
$GLOBALS['view'] = $view;
$record = is_array($view['record'] ?? null) ? $view['record'] : null;
$status = is_array($record) ? (string) ($record['status'] ?? '') : '';
$signature_valid = is_array($record) && ($record['signature_verified'] ?? false) === true;
$cancelled = $signature_valid && (($record['cancelled'] ?? false) === true || $status === 'cancelled');
$valid = is_array($record) && ! $cancelled && $signature_valid && $status === 'issued';
$public_status = $signature_valid ? ucfirst($status) : 'Unverified';
$state_class = ! $signature_valid ? 'is-invalid' : ($cancelled ? 'is-cancelled' : ($valid ? 'is-verified' : 'is-invalid'));
$state_title = ! $signature_valid ? 'Invoice invalid' : ($cancelled ? 'Invoice cancelled' : ($valid ? 'Invoice verified' : 'Invoice invalid'));
$state_lead = ! $signature_valid
    ? 'The invoice record could not be authenticated. Contact E7 Company before taking action.'
    : ($cancelled
        ? 'This authenticated invoice has been cancelled and must not be treated as payable.'
        : ($valid
            ? 'The invoice record and cryptographic signature are valid.'
            : 'The invoice record could not be fully validated. Contact E7 Company before taking action.'));
get_header();
?>
<main id="main-content" class="proposal-main">
    <section class="verify-card invoice-verify" aria-labelledby="invoice-verification-title">
        <header class="verify-heading">
            <div class="verification-mark <?php echo esc_attr($state_class); ?>" aria-hidden="true"><?php echo $valid ? '✓' : '!'; ?></div>
            <p class="eyebrow">Invoice verification</p>
            <h1 id="invoice-verification-title"><?php echo esc_html($state_title); ?></h1>
            <p class="verify-lead"><?php echo esc_html($state_lead); ?></p>
            <div class="verification-status <?php echo esc_attr($state_class); ?>"><span aria-hidden="true"></span><?php echo esc_html($state_title); ?></div>
        </header>

        <?php if (is_array($record)) : ?>
        <section aria-labelledby="invoice-summary-title">
            <h2 class="verify-section-title" id="invoice-summary-title">Invoice summary</h2>
            <dl class="verify-list verify-list-summary">
                <div><dt>Invoice number</dt><dd><?php echo esc_html((string) $record['invoice_number']); ?></dd></div>
                <div><dt>Supplier</dt><dd><?php echo esc_html((string) $record['supplier_legal_name']); ?></dd></div>
                <div><dt>Customer</dt><dd><?php echo esc_html((string) $record['customer_legal_name']); ?></dd></div>
                <div><dt>Issued at</dt><dd><?php echo esc_html((string) $record['issued_at']); ?></dd></div>
                <div><dt>Total</dt><dd><?php echo esc_html((string) $record['currency'] . ' ' . (string) $record['total']); ?></dd></div>
                <div><dt>Status</dt><dd><?php echo esc_html($public_status); ?></dd></div>
                <?php if ($signature_valid && (string) ($record['replacement_invoice_number'] ?? '') !== '') : ?><div><dt>Replacement invoice</dt><dd><?php echo esc_html((string) $record['replacement_invoice_number']); ?></dd></div><?php endif; ?>
            </dl>
        </section>

        <details class="verification-technical">
            <summary>Technical details</summary>
            <dl class="verify-list">
                <div><dt>Artifact SHA-256</dt><dd class="hash"><code><?php echo esc_html((string) $record['artifact_hash']); ?></code></dd></div>
                <div><dt>Cryptographic signature</dt><dd><?php echo esc_html(($record['signature_verified'] ?? false) === true ? 'Valid' : 'Invalid'); ?></dd></div>
            </dl>
        </details>
        <?php endif; ?>
    </section>
</main>
<?php get_footer(); ?>
