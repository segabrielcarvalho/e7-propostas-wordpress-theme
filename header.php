<?php
$view = function_exists('e7_propostas_view') ? e7_propostas_view() : [];
$locale = (string) ($view['locale'] ?? $view['settings']['locale'] ?? 'pt_BR');
$lang = $locale === 'pt_BR' ? 'pt-BR' : 'en-IE';
?><!doctype html>
<html lang="<?php echo esc_attr($lang); ?>">
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <?php wp_head(); ?>
</head>
<body <?php body_class('e7-proposals'); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main-content"><?php echo esc_html($lang === 'pt-BR' ? 'Ir para o conteúdo' : 'Skip to content'); ?></a>
<?php if (($view['screen'] ?? '') !== 'proposal') : ?>
<header class="site-header">
    <div class="shell header-inner">
        <img src="<?php echo esc_url(get_template_directory_uri() . '/assets/brand/e7-company-logo-transparent-256.webp'); ?>" width="256" height="119" alt="E7 Company">
    </div>
</header>
<?php endif; ?>
