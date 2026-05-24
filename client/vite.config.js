import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],

    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (
                        id.includes('node_modules/react-dom') ||
                        id.includes('node_modules/react/')
                    ) {
                        return 'vendor';
                    }

                    if (
                        id.includes('node_modules/react-router-dom') ||
                        id.includes('node_modules/react-router/')
                    ) {
                        return 'router';
                    }

                    if (id.includes('node_modules/@tanstack/react-query')) {
                        return 'query';
                    }

                    if (id.includes('node_modules/lucide-react')) {
                        return 'icons';
                    }

                    if (
                        id.includes('node_modules/axios') ||
                        id.includes('node_modules/react-hot-toast')
                    ) {
                        return 'utils';
                    }
                }
            }
        },
        chunkSizeWarningLimit: 1000,
        sourcemap: true
    },

    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom']
    }
})