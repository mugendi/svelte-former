/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import serve from 'rollup-plugin-serve';
import hmr from 'rollup-plugin-reloadsite';
import commonjs from '@rollup/plugin-commonjs';
import styles from 'rollup-plugin-styles';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
    // This `main.js` file we wrote
    input: 'src/index.js',
    output: {
        // The destination for our bundled JavaScript
        file: 'build/svelte-former.js',
        // Our bundle will be an Immediately-Invoked Function Expression
        format: 'iife',
        // The IIFE return value will be assigned into a variable called `app`
        name: 'SvelteFormer',
        sourcemap: !production ? 'inline' : false,
    },
    plugins: [
        styles(),

        // Tell any third-party plugins that we're building for the browser
        resolve({
            browser: true,
            dedupe: ['svelte'],
            exportConditions: ['svelte'],
        }),

        commonjs(),

        svelte({
            // Tell the svelte plugin where our svelte files are located
            include: 'src/**/*.svelte',
        }),

        production && terser({ output: { comments: false } }),

        !production &&
            serve({
                open: true,
                host: 'localhost',
                port: 10001,
                openPage: '/examples/index.html',
            }),

        !production &&
            hmr({
                dirs: ['./build', './examples'],
                filter: '**/svelte-former.js',
            }),
    ],
};
