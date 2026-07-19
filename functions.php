<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function e7_propostas_theme_setup(): void
{
    add_theme_support('title-tag');
    add_theme_support('responsive-embeds');
    add_theme_support('align-wide');
    add_theme_support('editor-styles');
    add_editor_style('assets/css/app.css');
}
add_action('after_setup_theme', 'e7_propostas_theme_setup');

function e7_propostas_theme_assets(): void
{
    $css = get_template_directory() . '/assets/css/app.css';
    $js = get_template_directory() . '/assets/js/proposal.js';
    $phoneCss = get_template_directory() . '/assets/vendor/intl-tel-input/css/intlTelInput.min.css';
    $phoneJs = get_template_directory() . '/assets/vendor/intl-tel-input/js/intlTelInputWithUtils.min.js';
    wp_enqueue_style('e7-intl-tel-input', get_template_directory_uri() . '/assets/vendor/intl-tel-input/css/intlTelInput.min.css', [], (string) filemtime($phoneCss));
    wp_enqueue_style('e7-propostas', get_template_directory_uri() . '/assets/css/app.css', ['e7-intl-tel-input'], (string) filemtime($css));
    wp_enqueue_script('e7-intl-tel-input', get_template_directory_uri() . '/assets/vendor/intl-tel-input/js/intlTelInputWithUtils.min.js', [], (string) filemtime($phoneJs), ['strategy' => 'defer', 'in_footer' => true]);
    wp_enqueue_script('e7-propostas', get_template_directory_uri() . '/assets/js/proposal.js', ['e7-intl-tel-input'], (string) filemtime($js), ['strategy' => 'defer', 'in_footer' => true]);
}
add_action('wp_enqueue_scripts', 'e7_propostas_theme_assets');

function e7_propostas_generic_meta(): void
{
    $image = get_template_directory_uri() . '/assets/brand/e7-propostas-social-preview.jpg';
    $page_title = e7_propostas_current_page_title();
    $social_title = $page_title !== '' ? $page_title . ' - E7 Company' : 'Private proposal - E7 Company';
    echo '<meta name="description" content="Private proposal from E7 Company.">' . "\n";
    echo '<meta property="og:type" content="website">' . "\n";
    echo '<meta property="og:title" content="' . esc_attr($social_title) . '">' . "\n";
    echo '<meta property="og:description" content="Use the secure link and password supplied by E7 Company.">' . "\n";
    echo '<meta property="og:image" content="' . esc_url($image) . '">' . "\n";
    echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
    echo '<meta name="twitter:title" content="' . esc_attr($social_title) . '">' . "\n";
    echo '<link rel="icon" href="' . esc_url(get_template_directory_uri() . '/assets/brand/favicon.ico') . '">' . "\n";
}
add_action('wp_head', 'e7_propostas_generic_meta', 2);

function e7_propostas_current_page_title(): string
{
    if (! function_exists('e7_propostas_view')) {
        return '';
    }

    $view = e7_propostas_view();
    return sanitize_text_field((string) ($view['page_title'] ?? ''));
}

add_filter('pre_get_document_title', static function (string $title): string {
    $page_title = e7_propostas_current_page_title();
    return $page_title !== '' ? $page_title . ' - E7 Company' : $title;
});

function e7_propostas_block_robots(string $output, bool $public): string
{
    unset($output, $public);

    return "User-agent: *\nDisallow: /\n";
}
add_filter('robots_txt', 'e7_propostas_block_robots', PHP_INT_MAX, 2);

function e7_propostas_robots_directives(array $robots): array
{
    unset($robots);

    return [
        'noindex' => true,
        'nofollow' => true,
        'noarchive' => true,
        'nosnippet' => true,
        'noimageindex' => true,
    ];
}
add_filter('wp_robots', 'e7_propostas_robots_directives', PHP_INT_MAX);

function e7_propostas_noindex_headers(): void
{
    if (is_admin()) {
        return;
    }

    header('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex', true);
}
add_action('send_headers', 'e7_propostas_noindex_headers', PHP_INT_MAX);

add_filter('wp_sitemaps_enabled', '__return_false');

function e7_propostas_block_llm_discovery(): void
{
    $request_uri = isset($_SERVER['REQUEST_URI']) ? wp_unslash((string) $_SERVER['REQUEST_URI']) : '';
    $request_path = (string) parse_url($request_uri, PHP_URL_PATH);

    if (! in_array($request_path, ['/llms.txt', '/llms-full.txt'], true)) {
        return;
    }

    status_header(403);
    nocache_headers();
    header('Content-Type: text/plain; charset=utf-8', true);
    echo "Automated AI access is not permitted.\n";
    exit;
}
add_action('template_redirect', 'e7_propostas_block_llm_discovery', -1000);
