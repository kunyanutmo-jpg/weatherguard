import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js', 'resources/js/map.js', 'resources/js/auth.js', 'resources/js/password-reset.js', 'resources/js/locations.js'],
            refresh: true,
        }),
    ],
});
