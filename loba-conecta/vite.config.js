import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "npm run build"      -> app real (necesita las variables VITE_SUPABASE_*)
// "npm run build:demo" -> un solo archivo HTML con datos de ejemplo
export default defineConfig(({ mode }) => ({
  plugins: mode === 'demo' ? [react(), viteSingleFile()] : [react()],
  base: './',
  build: {
    outDir: mode === 'demo' ? 'dist-demo' : 'dist',
    emptyOutDir: true,
    copyPublicDir: mode !== 'demo',
  },
}));
