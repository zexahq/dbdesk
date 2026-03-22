import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

import PGSQLWorker from 'monaco-sql-languages/esm/languages/pgsql/pgsql.worker?worker'

import { LanguageIdEnum, setupLanguageFeatures } from 'monaco-sql-languages'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { createCompletionService } from './completion-service'

// Configure Monaco Environment for workers
window.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === 'json') {
      return new JsonWorker()
    }
    if (label === LanguageIdEnum.PG) {
      return new PGSQLWorker()
    }
    return new EditorWorker()
  }
}

setupLanguageFeatures(LanguageIdEnum.PG, {
  completionItems: {
    enable: true,
    triggerCharacters: [' ', '.'],
    completionService: createCompletionService()
  }
})

// Configure Monaco to only load English locale (reduces bundle size)
loader.config({
  monaco,
  paths: {
    vs: 'app-asset://node_modules/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'en' // Only load English locale, exclude all other language packs
    }
  }
})
