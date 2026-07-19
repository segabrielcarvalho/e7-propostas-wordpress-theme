import { copyFile, mkdir } from 'node:fs/promises';

await copyFile(new URL('../src/input.css', import.meta.url), new URL('../assets/css/app.css', import.meta.url));

const vendor = new URL('../assets/vendor/intl-tel-input/', import.meta.url);
await Promise.all([
  mkdir(new URL('css/', vendor), { recursive: true }),
  mkdir(new URL('js/', vendor), { recursive: true }),
  mkdir(new URL('img/', vendor), { recursive: true }),
]);
await Promise.all([
  copyFile(new URL('../node_modules/intl-tel-input/dist/css/intlTelInput.min.css', import.meta.url), new URL('css/intlTelInput.min.css', vendor)),
  copyFile(new URL('../node_modules/intl-tel-input/dist/js/intlTelInputWithUtils.min.js', import.meta.url), new URL('js/intlTelInputWithUtils.min.js', vendor)),
  copyFile(new URL('../node_modules/intl-tel-input/dist/img/flags.webp', import.meta.url), new URL('img/flags.webp', vendor)),
  copyFile(new URL('../node_modules/intl-tel-input/dist/img/flags@2x.webp', import.meta.url), new URL('img/flags@2x.webp', vendor)),
]);
