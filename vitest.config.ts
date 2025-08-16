import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    return {
        test: {
            environment: 'jsdom',
            globals: true,
            setupFiles: ['./src/test/setup.ts'],
            env: env,
        },
        resolve: {
            alias: {
                '@': resolve(__dirname, './src'),
            },
        },
    }
})