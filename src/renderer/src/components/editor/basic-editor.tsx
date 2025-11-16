'use client'

import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { KeyCode } from 'monaco-editor'
import * as React from 'react'

interface BasicEditorProps {
  value: string
  onChange?: (value: string) => void
  onSave?: () => void
  onCancel?: () => void
  height?: string
  language?: string
}

export function BasicEditor({
  value,
  onChange,
  onSave,
  onCancel,
  height = '300px',
  language = 'plaintext'
}: BasicEditorProps) {
  const editorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null)

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const disposable = editor.onKeyDown((e) => {
      // Enter key to save (Ctrl+Enter or Cmd+Enter)
      if ((e.ctrlKey || e.metaKey) && e.keyCode === KeyCode.Enter) {
        e.preventDefault()
        e.stopPropagation()
        onSave?.()
        return
      }

      // Escape to cancel
      if (e.keyCode === KeyCode.Escape) {
        e.preventDefault()
        e.stopPropagation()
        onCancel?.()
        return
      }
    })

    return () => {
      disposable.dispose()
    }
  }, [onSave, onCancel])

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
    editor.focus()
    editor.trigger(editor.getModel()?.uri.toString() ?? '', 'editor.action.formatDocument', null)
  }

  return (
    <Editor
      height={height}
      language={language}
      theme="vs-dark"
      value={value}
      onChange={(val) => onChange?.(val ?? '')}
      onMount={handleEditorDidMount}
      options={{
        minimap: { enabled: false },

        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        fontSize: 14,
        lineNumbers: 'off',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        renderLineHighlight: 'none',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        overviewRulerBorder: false,
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: false,
          verticalHasArrows: false,
          horizontalHasArrows: false
        }
      }}
    />
  )
}
