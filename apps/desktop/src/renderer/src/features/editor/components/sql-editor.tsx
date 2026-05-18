import type { SQLDatabaseType } from '@dbdesk/shared/types'
import Editor, { type Monaco } from '@monaco-editor/react'
import { useTheme } from '@renderer/shared/hooks/use-theme'
import type { editor } from 'monaco-editor'
import { KeyCode, KeyMod } from 'monaco-editor'
import { LanguageIdEnum } from 'monaco-sql-languages'
import { useEffect, useRef, useState } from 'react'
import { format as formatSql } from 'sql-formatter'

// Map SQL database types to sql-formatter dialects.
const FORMATTER_DIALECTS: Record<SQLDatabaseType, 'postgresql'> = {
  postgres: 'postgresql'
}

// Track which (monaco instance, languageId) pairs already have a formatter
// provider registered so HMR / multiple editor instances don't stack them.
const registeredFormatters = new WeakMap<Monaco, Set<string>>()

const registerSqlFormatter = (monaco: Monaco, languageId: string, dialect: 'postgresql') => {
  let registered = registeredFormatters.get(monaco)
  if (!registered) {
    registered = new Set()
    registeredFormatters.set(monaco, registered)
  }
  if (registered.has(languageId)) return
  registered.add(languageId)

  monaco.languages.registerDocumentFormattingEditProvider(languageId, {
    provideDocumentFormattingEdits(model) {
      try {
        const formatted = formatSql(model.getValue(), {
          language: dialect,
          keywordCase: 'upper',
          tabWidth: 2,
          useTabs: false
        })
        return [{ range: model.getFullModelRange(), text: formatted }]
      } catch {
        // sql-formatter throws on unparseable input; leave the buffer untouched.
        return []
      }
    }
  })
}

interface SqlEditorProps {
  tabId: string
  value: string
  onChange: (value: string) => void
  language: SQLDatabaseType
  onExecute?: () => void
}

export default function SqlEditor({ value, onChange, language, onExecute }: SqlEditorProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const onExecuteRef = useRef(onExecute)
  const [height, setHeight] = useState('400px')

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs'
  const languageId = LanguageIdEnum.PG
  const formatterDialect = FORMATTER_DIALECTS[language]

  // Keep onExecute ref updated
  useEffect(() => {
    onExecuteRef.current = onExecute
  }, [onExecute])

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setHeight(`${containerRef.current.clientHeight}px`)
      }
    }

    updateHeight()
    const resizeObserver = new ResizeObserver(updateHeight)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editorInstance

    // Register Ctrl+Enter keybinding for query execution
    editorInstance.addAction({
      id: 'execute-query',
      label: 'Execute Query',
      keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
      run: () => {
        onExecuteRef.current?.()
      }
    })

    // Hook sql-formatter into Monaco's standard "Format Document" command
    // (Shift+Alt+F). Also expose an explicit action so the command palette
    // and right-click menu surface a labeled entry.
    registerSqlFormatter(monaco, languageId, formatterDialect)
    editorInstance.addAction({
      id: 'format-sql',
      label: 'Format SQL',
      keybindings: [KeyMod.Shift | KeyMod.Alt | KeyCode.KeyF],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1.5,
      run: (ed) => {
        ed.getAction('editor.action.formatDocument')?.run()
      }
    })
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <Editor
        height={height}
        language={languageId}
        theme={editorTheme}
        value={value}
        onChange={(val) => onChange(val ?? '')}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          smoothScrolling: true
        }}
      />
    </div>
  )
}
