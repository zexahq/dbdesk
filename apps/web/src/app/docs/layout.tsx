import type { ReactNode } from 'react'

import { DocsLayout } from 'fumadocs-ui/layouts/docs'

import { baseOptions } from '@/lib/layout.shared'
import { source } from '@/lib/source'

type DocsLayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: DocsLayoutProps) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions()}>
      {children}
    </DocsLayout>
  )
}
