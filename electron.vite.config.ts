import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { bytecodePlugin, defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'
import type { Plugin } from 'vite'

// Allowed SQL-related languages from basic-languages folder
const allowedBasicLanguages = ['sql', 'mysql', 'pgsql', 'redshift', 'msdax']

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
      // Check if this is from basic-languages folder
      const basicLanguagesMatch = id.match(/monaco-editor\/[^/]+\/vs\/basic-languages\/([^/]+)\//)
      if (basicLanguagesMatch) {
        const language = basicLanguagesMatch[1]
        // Block non-SQL languages by returning a virtual module
        if (language && !allowedBasicLanguages.includes(language)) {
          return '\0monaco-blocked:' + id
        }
      }

      // Check if this is from language folder (not basic-languages)
      const languageFolderMatch = id.match(/monaco-editor\/[^/]+\/vs\/language\/([^/]+)\//)
      if (languageFolderMatch) {
        const language = languageFolderMatch[1]
        // Block non-JSON languages by returning a virtual module
        if (language && !allowedLanguageFolder.includes(language)) {
          return '\0monaco-blocked:' + id
        }
      }

      return null
    },
    load(id) {
      // Return empty module for blocked language modules
      if (id.startsWith('\0monaco-blocked:')) {
        return 'export {}'
      }
      return null
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin(), bytecodePlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@common': resolve('src/common')
      }
    },
    plugins: [
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
