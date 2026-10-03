import { defineConfig, Plugin } from 'vite'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Resolve Figma Make's `figma:asset/<hash>.png` imports to local files
// extracted from the .make archive into src/assets/figma/.
const ASSETS_DIR = path.resolve(__dirname, './src/assets/figma')
const TRANSPARENT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

function figmaAssetResolver(): Plugin {
  return {
    name: 'figma-asset-resolver',
    enforce: 'pre',
    resolveId(id) {
      if (!id.startsWith('figma:asset/')) return null
      const filename = id.slice('figma:asset/'.length)
      const localPath = path.join(ASSETS_DIR, filename)
      if (fs.existsSync(localPath)) return localPath
      return '\0' + id
    },
    load(id) {
      if (id.startsWith('\0figma:asset/')) {
        return `export default ${JSON.stringify(TRANSPARENT_PNG)};`
      }
    },
  }
}

export default defineConfig({
  root: path.resolve(__dirname, '.'),
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        // Split heavy vendor libs into separate chunks for better caching and
        // parallel download. Returning a chunk name = Rollup creates the chunk.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-dom') || /node_modules[\\/]react[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('motion')) return 'vendor-motion';
          if (id.includes('@radix-ui') || id.includes('lucide-react')) return 'vendor-ui';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'motion', 'motion/react'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'motion/react'],
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
