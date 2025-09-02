import { defineConfig } from 'vite'
import dts from 'unplugin-dts/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    build: {
        lib: {
            entry: ['./src/index.ts'],
            fileName: 'index',
            formats: ['es']
        },
        ssr: true
    },
    plugins: [dts(), viteStaticCopy({
        targets: [{ src: './src/index.css', dest: '' }],
    })],
})