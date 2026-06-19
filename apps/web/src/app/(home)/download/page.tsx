import type { Metadata } from 'next'
import { getReleases } from '@/lib/github'
import { LatestRelease } from './components/latest-release'
import { OSDetect } from './components/os-detect'

export const metadata: Metadata = {
  title: 'Download dbdesk',
  description: 'Download dbdesk for your operating system'
}

export const revalidate = 300 // revalidate every 5 minutes

export default async function DownloadPage() {
  const releases = await getReleases()
  const latestRelease = releases.find((r) => r.isLatest)

  return (
    <main className="min-h-screen bg-fd-background">
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <OSDetect assets={latestRelease?.assets} />

          {latestRelease ? (
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-fd-foreground mb-4">Latest Release</h3>
              <LatestRelease release={latestRelease} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="border border-fd-border rounded-lg p-4 bg-fd-secondary/30">
                  <p className="mb-2 text-xs text-fd-muted-foreground">
                    Install via Homebrew (macOS):
                  </p>
                  <code
                    className="block bg-fd-background border border-fd-border p-3 rounded text-xs select-all text-fd-foreground leading-relaxed"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    brew tap zexahq/dbdesk<br />
                    brew trust zexahq/dbdesk<br />
                    brew install --cask dbdesk
                  </code>
                </div>
                <div className="border border-fd-border rounded-lg p-4 bg-fd-secondary/30">
                  <p className="mb-2 text-xs text-fd-muted-foreground">
                    For AppImage, make it executable:
                  </p>
                  <code
                    className="block bg-fd-background border border-fd-border p-3 rounded text-xs select-all text-fd-foreground"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    chmod +x dbdesk-*.AppImage && ./dbdesk-*.AppImage
                  </code>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-fd-muted-foreground mb-6">Unable to fetch releases</p>
              <a
                href="https://github.com/zexahq/dbdesk/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded border border-fd-border hover:bg-fd-secondary transition-colors text-fd-foreground"
              >
                View on GitHub
                <span>→</span>
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
