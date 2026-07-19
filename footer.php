<footer class="trust-footer">
    <?php $footerPt = ($GLOBALS['view']['locale'] ?? $GLOBALS['view']['settings']['locale'] ?? 'pt_BR') === 'pt_BR'; ?>
    <div class="shell legal-row">
        <span>© <?php echo esc_html(wp_date('Y')); ?> E7 Company Tecnologia LTDA.</span>
        <nav aria-label="Legal"><a href="<?php echo esc_url(home_url('/privacy/')); ?>"><?php echo esc_html($footerPt ? 'Privacidade' : 'Privacy'); ?></a><a href="<?php echo esc_url(home_url('/electronic-acceptance/')); ?>"><?php echo esc_html($footerPt ? 'Termos de aceite' : 'Electronic acceptance'); ?></a><a href="<?php echo esc_url(home_url('/validation/')); ?>"><?php echo esc_html($footerPt ? 'Validar' : 'Validate'); ?></a></nav>
    </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
