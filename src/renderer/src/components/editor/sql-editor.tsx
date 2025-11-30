import Editor from '@monaco-editor/react'
import { useTheme } from '@renderer/hooks/use-theme'
import type { editor } from 'monaco-editor'
import { useEffect, useRef, useState } from 'react'

interface SqlEditorProps {
  tabId: string
  value: string
  onChange: (value: string) => void
}

export default function SqlEditor({ value, onChange }: SqlEditorProps) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [height, setHeight] = useState('400px')

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'vs'

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

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <Editor
        height={height}
        language="sql"
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
