import type { SQLDatabaseType } from '@dbdesk/shared/types'
import Editor from '@monaco-editor/react'
import { useTheme } from '@renderer/shared/hooks/use-theme'
import type { editor } from 'monaco-editor'
import { KeyCode, KeyMod } from 'monaco-editor'
import { LanguageIdEnum } from 'monaco-sql-languages'
import { useEffect, useRef, useState } from 'react'

interface SqlEditorProps {
  tabId: string
  value: string
  onChange: (value: string) => void
  language: SQLDatabaseType
  onExecute?: () => void
  onEditorMount?: (editorInstance: editor.IStandaloneCodeEditor) => void
}

export default function SqlEditor({ tabId, value, onChange, onExecute, onEditorMount, language }: SqlEditorProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const onExecuteRef = useRef(onExecute)
  const [height, setHeight] = useState('400px')
  const [editorValue, setEditorValue] = useState(value)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs'

  const languageIdMap: Record<SQLDatabaseType, LanguageIdEnum> = {
    postgres: LanguageIdEnum.PG
  }
  const languageId = languageIdMap[language] ?? LanguageIdEnum.PG

  // Sync from prop when tab changes or external value changes
  useEffect(() => {
    setEditorValue(value)
  }, [tabId, value])

  // Auto-focus editor when switching tabs or creating a new tab
  useEffect(() => {
    // Focus immediately if editor is already mounted
    if (editorRef.current) {
      editorRef.current.focus()
      return
    }

    // If editor isn't mounted yet, wait for next render cycle
    // This handles the case when a new tab is created
    const timer = setTimeout(() => {
      editorRef.current?.focus()
    }, 0)

    return () => clearTimeout(timer)
  }, [tabId])

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

  const handleChange = (val: string) => {
    setEditorValue(val)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onChange(val)
    }, 300)
  }

  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance
    onEditorMount?.(editorInstance)

    // Focus the editor when it mounts (handles new tab creation)
    editorInstance.focus()

    // Register Ctrl+Enter keybinding for query execution
    editorInstance.addAction({
      id: 'execute-query',
      label: 'Execute Query',
      keybindings: [KeyMod.CtrlCmd | KeyCode.Enter],
      run: () => {
        onExecuteRef.current?.()
      }
    })
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <Editor
        height={height}
        language={languageId}
        theme={editorTheme}
        value={editorValue}
        onChange={(val) => handleChange(val ?? '')}
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