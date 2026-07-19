<?php
$GLOBALS['view'] = ['locale' => 'en_IE'];
get_header();
?>
<main id="main-content" class="proposal-main">
    <section class="gate-card legal-page">
        <?php
        while (have_posts()) {
            the_post();
            ?>
            <p class="eyebrow">E7 COMPANY</p>
            <h1><?php the_title(); ?></h1>
            <div class="legal-content"><?php the_content(); ?></div>
            <?php
        }
        ?>
    </section>
</main>
<?php
get_footer();
