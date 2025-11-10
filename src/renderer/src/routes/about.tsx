import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About
})

function About() {
  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col gap-4">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-balance">
        DBDesk: Reimagining the PostgreSQL Experience for Developers
      </h1>

      <p className="text-muted-foreground text-xl leading-7 not-first:mt-6">
        A modern PostgreSQL desktop client focused on what you actually use. Designed for devs, by
        devs.
      </p>
    </div>
  )
}
