import type { SQLDatabaseType } from '@dbdesk/shared/types'
import Editor from '@monaco-editor/react'
import { useTheme } from '@renderer/shared/hooks/use-theme'
import type { editor } from 'monaco-editor'
import { KeyCode, KeyMod } from 'monaco-editor'
import { LanguageIdEnum } from 'monaco-sql-languages'
import { useEffect, useRef, useState } from 'react'

const LANGUAGE_MAP: Record<SQLDatabaseType, LanguageIdEnum> = {
  postgres: LanguageIdEnum.PG,
}

function getLanguageId(type: SQLDatabaseType): LanguageIdEnum {
  return LANGUAGE_MAP[type] ?? LanguageIdEnum.PG
}

interface SqlEditorProps {
  tabId: string
  value: string
  onChange: (value: string) => void
  language: SQLDatabaseType
  onExecute?: () => void
  onEditorMount?: (editorInstance: editor.IStandaloneCodeEditor) => void
}

export default function SqlEditor({ value, onChange, language, onExecute, onEditorMount }: SqlEditorProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const onExecuteRef = useRef(onExecute)
  const [height, setHeight] = useState('400px')

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs'
  const languageId = getLanguageId(language)

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

  const handleEditorDidMount = (editorInstance: editor.IStandaloneCodeEditor) => {
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

    onEditorMount?.(editorInstance)
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
