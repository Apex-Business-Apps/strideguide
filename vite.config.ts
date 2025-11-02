import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Production hardening
    minify: mode === 'production' ? 'terser' : false,
    sourcemap: mode === 'development',
    // Increase chunk size warning limit temporarily to avoid noise during optimization
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Advanced code splitting for optimal bundle sizes
        manualChunks: (id) => {
          // Heavy ML/AI libraries - lazy load these
          if (id.includes('@huggingface/transformers')) {
            return 'ml-transformers';
          }
          if (id.includes('onnxruntime')) {
            return 'ml-onnx';
          }

          // UI Component libraries - split by vendor
          if (id.includes('@radix-ui')) {
            return 'ui-radix';
          }
          if (id.includes('lucide-react')) {
            return 'ui-icons';
          }

          // Charts and visualization
          if (id.includes('recharts') || id.includes('victory')) {
            return 'charts';
          }

          // Form handling
          if (id.includes('react-hook-form') || id.includes('@hookform')) {
            return 'forms';
          }

          // Supabase and authentication
          if (id.includes('@supabase')) {
            return 'supabase';
          }

          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'react-query';
          }

          // Router
          if (id.includes('react-router')) {
            return 'router';
          }

          // i18n
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }

          // Date utilities
          if (id.includes('date-fns')) {
            return 'date-utils';
          }

          // Core React
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }

          // Other node_modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Ensure consistent chunk naming
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    ...(mode === 'production' && {
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info']
        },
        mangle: {
          safari10: true
        }
      }
    })
  },
  define: {
    __DEV__: mode === 'development',
    'process.env.NODE_ENV': JSON.stringify(mode),
    'process.env.CLOUD_DESCRIBE_ENABLED': JSON.stringify(process.env.CLOUD_DESCRIBE_ENABLED || 'false')
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ],
    exclude: [
      '@huggingface/transformers',
      'onnxruntime-web'
    ]
  }
}));
