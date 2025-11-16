import Editor from '@monaco-editor/react'

export default function SqlEditor() {
  return (
    <Editor height="400px" language="sql" theme="vs-dark" defaultValue="SELECT * FROM my_table;" />
  )
}
