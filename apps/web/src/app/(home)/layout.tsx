import type { ReactNode } from 'react'

import { Navbar } from './components/navbar'
import { StripedPattern } from './components/stripped-pattern'

type HomeLayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: HomeLayoutProps) {
  return (
    <main className="flex min-h-screen bg-fd-background text-fd-foreground overflow-x-hidden">
      <div className="hidden lg:flex flex-1 justify-end min-w-[30px]">
        <div className="w-[30px] relative border-l border-dashed border-fd-border">
          <StripedPattern
            className="stroke-[0.3]"
            direction="left"
            width={7}
            height={7}
          />
        </div>
      </div>
      <div className="w-full max-w-6xl flex flex-col">
        <Navbar />
        {children}
      </div>
      <div className="hidden lg:flex flex-1 justify-start min-w-[30px]">
        <div className="w-[30px] relative border-r border-dashed border-fd-border">
          <StripedPattern
            className="stroke-[0.3]"
            direction="right"
            width={7}
            height={7}
          />
        </div>
      </div>
    </main>
  );
}
