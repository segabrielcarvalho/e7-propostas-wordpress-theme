<?php
$GLOBALS['view'] = ['locale' => 'en_IE'];
get_header();
$main_site_url = network_home_url('/');
?>
<main id="main-content" class="proposal-main proposal-empty-main">
    <section class="proposal-empty-state" aria-labelledby="proposal-empty-title">
        <p class="eyebrow">E7 COMPANY</p>
        <h1 id="proposal-empty-title">Private proposal access</h1>
        <p>Use the private link sent by E7 Company to access your proposal. If you were looking for our website, continue below.</p>
        <a class="button-primary" href="<?php echo esc_url($main_site_url); ?>">Visit E7 Company</a>
    </section>
</main>
<?php
get_footer();
