export function AboutSection({ version }: { version: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">DBDesk</p>
        <p className="text-xs text-muted-foreground mt-0.5">Version {version || '…'}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Postgres databases, SQL workspace, and dashboards on your desktop — with a CLI your AI
        agents can drive.
      </p>
      <div className="flex gap-4 text-xs">
        <a
          className="text-primary hover:underline"
          href="https://github.com/zexahq/dbdesk"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a
          className="text-primary hover:underline"
          href="https://github.com/zexahq/dbdesk/releases"
          target="_blank"
          rel="noreferrer"
        >
          Releases
        </a>
        <a
          className="text-primary hover:underline"
          href="https://github.com/zexahq/dbdesk/issues"
          target="_blank"
          rel="noreferrer"
        >
          Report an issue
        </a>
      </div>
    </div>
  )
}
