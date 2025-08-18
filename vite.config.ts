import { defineConfig } from 'vite'
import dts from 'unplugin-dts/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    build: {
        lib: {
            entry: ['./src/index.ts', './src/index.css'],
            fileName: 'index',
            formats: ['es']
        },
        rollupOptions: {
            external: ['@myriaddreamin/rehype-typst', '@myriaddreamin/typst-ts-node-compiler', 'unified', 'rehype-parse', 'rehype-stringify', 'cheerio'],
        },
        cssCodeSplit: true,
        ssr: true
    },
    plugins: [dts(), viteStaticCopy({
        targets: [{ src: './src/index.css', dest: '' }],
    })],
})