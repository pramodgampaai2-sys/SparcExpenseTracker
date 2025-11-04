import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'remove-tailwind-cdn-for-build',
      apply: 'build', // Only run this plugin during the build process
      transformIndexHtml(html) {
        return html.replace(
          '<script src="https://cdn.tailwindcss.com"></script>',
          ''
        );
      },
    }
  ],
  server: {
    // This proxy is useful for local development when running Vercel's dev server
    proxy: {
      '/api': {
        target: 'http://localhost:3001', 
        changeOrigin: true,
      }
    }
  }
})