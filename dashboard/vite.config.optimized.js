import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    // Performance optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-switch',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-popover',
            '@radix-ui/react-slot'
          ],
          'vendor-charts': ['recharts'],
          'vendor-socket': ['socket.io-client'],
          'vendor-utils': ['axios', 'date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable sourcemaps for production debugging
    sourcemap: true,
    // Optimize minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for now
        drop_debugger: true
      }
    }
  }
})
