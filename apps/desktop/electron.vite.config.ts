import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { config as loadDotenv } from 'dotenv'
import { resolve } from 'path'
import type { Plugin } from 'vite'

// Load .env files at config time so `define` replacements work.
// electron-vite does NOT load .env automatically for main/preload.
loadDotenv({ path: resolve('.env') })
loadDotenv({ path: resolve(`.env.${process.env.NODE_ENV ?? 'development'}`), override: true })

/** Build-time `define` replacements for main + preload. */
function envDefines() {
  return {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3000'),
    __WEB_URL__: JSON.stringify(process.env.VITE_WEB_URL || 'http://localhost:3000'),
  }
}

// Allowed SQL-related languages from basic-languages folder
const allowedBasicLanguages = ['sql', 'pgsql', 'redshift', 'msdax']

// Allowed languages from language folder (only JSON)
const allowedLanguageFolder = ['json']

/**
 * Vite plugin to filter out unused Monaco Editor language files
 * Only includes SQL-related languages from basic-languages and JSON from language folder
 */
function monacoLanguageFilter(): Plugin {
  return {
    name: 'monaco-language-filter',
    resolveId(id) {
      // Filter at resolution time to prevent module from being loaded at all
      // Check if this is a basic-languages contribution file we don't need
      const basicLanguagesMatch = id.match(/\/basic-languages\/([^/]+)\//)
      if (basicLanguagesMatch) {
        const language = basicLanguagesMatch[1]
        if (language && !allowedBasicLanguages.includes(language)) {
          return '\x00monaco-filtered-language'
        }
      }

      // Check if this is a language folder contribution file we don't need
      const languageFolderMatch = id.match(/\/language\/([^/]+)\//)
      if (languageFolderMatch) {
        const language = languageFolderMatch[1]
        if (language && !allowedLanguageFolder.includes(language)) {
          return '\x00monaco-filtered-language'
        }
      }

      return null
    },
    load(id) {
      if (id === '\x00monaco-filtered-language') {
        return 'export {}'
      }
      return null
    }
  }
}

/**
 * Plugin to only register allowed Monaco languages
 * Overrides the default contribution that registers ALL languages
 */
function monacoSelectiveLanguageRegistration(): Plugin {
  return {
    name: 'monaco-selective-languages',
    load(id) {
      // Replace the global contribution file with a selective registration
      if (id.includes('vs/basic-languages/monaco.contribution.js')) {
        const imports = [
          "import '../editor/editor.api.js';",
          ...allowedBasicLanguages.map((lang) => `import "./${lang}/${lang}.contribution.js";`)
        ]
        return imports.join('\n')
      }
      return null
    }
  }
}

export default defineConfig({
  main: {
    define: envDefines(),
    build: {
      externalizeDeps: false,
      rollupOptions: {
        external: ['pg-native'],
      },
    },
  },
  preload: {
    define: envDefines(),
    build: {
      bytecode: true,
      externalizeDeps: false,
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      monacoSelectiveLanguageRegistration(),
      monacoLanguageFilter(),
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true
      }),
      react(),
      tailwindcss()
    ]
  }
})
