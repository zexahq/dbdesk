import Editor from '@monaco-editor/react'
import { useTheme } from '@renderer/hooks/use-theme'
import { useEffect, useRef, useState } from 'react'

export default function SqlEditor() {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
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

  return (
    <div ref={containerRef} className="h-full w-full">
      <Editor
        height={height}
        language="sql"
        theme={editorTheme}
        defaultValue="SELECT * FROM my_table;"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          smoothScrolling: true
        }}
      />
    </div>
  )
}
