import { Download } from 'lucide-react'
import type { Release } from '@/lib/github'
import { organizeAssets } from '@/lib/asset-utils'
import { Icons } from '@/components/icons'
import Link from 'next/link'

interface LatestReleaseProps {
  release: Release
}

export function LatestRelease({ release }: LatestReleaseProps) {
  const organized = organizeAssets(release.assets)

  return (
    <div className="border border-fd-border rounded-lg overflow-hidden bg-fd-background">
      <div className="px-6 py-4 flex items-center justify-between bg-fd-secondary/30 border-b border-fd-border">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold text-fd-foreground">
            {release.tag_name}
            <span className="ml-3 inline-flex items-center rounded-full border border-fd-border bg-fd-secondary/50 px-2 py-1 text-xs font-medium text-fd-secondary-foreground">
              Latest
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* macOS Card */}
          <div className="border border-fd-border rounded-lg p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <Icons.apple className="w-6 h-6 text-fd-foreground" />
              </div>
              <h4 className="text-base font-semibold text-fd-foreground">macOS</h4>
            </div>
            {organized.macos.length > 0 ? (
              <div className="space-y-2 flex-grow">
                {organized.macos.map((asset) => (
                  <a
                    key={asset.name}
                    href={asset.downloadUrl}
                    className="flex items-center justify-between p-3 rounded border border-fd-border hover:bg-fd-secondary/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fd-foreground truncate">
                        {asset.label}
                      </p>
                      <p className="text-xs text-fd-muted-foreground">{asset.size}</p>
                    </div>
                    <Download className="w-4 h-4 text-fd-muted-foreground group-hover:text-fd-foreground ml-2 flex-shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-6 rounded border border-fd-border border-dashed flex-grow">
                <p className="text-sm text-fd-muted-foreground">Coming soon</p>
              </div>
            )}
          </div>

          {/* Windows Card */}
          <div className="border border-fd-border rounded-lg p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <Icons.windows className="w-6 h-6 text-fd-foreground" />
              </div>
              <h4 className="text-base font-semibold text-fd-foreground">Windows</h4>
            </div>
            {organized.windows.length > 0 ? (
              <div className="space-y-2 flex-grow">
                {organized.windows.map((asset) => (
                  <a
                    key={asset.name}
                    href={asset.downloadUrl}
                    className="flex items-center justify-between p-3 rounded border border-fd-border hover:bg-fd-secondary/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fd-foreground truncate">
                        {asset.label}
                      </p>
                      <p className="text-xs text-fd-muted-foreground">{asset.size}</p>
                    </div>
                    <Download className="w-4 h-4 text-fd-muted-foreground group-hover:text-fd-foreground ml-2 flex-shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-6 rounded border border-fd-border border-dashed flex-grow">
                <p className="text-sm text-fd-muted-foreground">Coming soon</p>
              </div>
            )}
          </div>

          {/* Linux Card */}
          <div className="border border-fd-border rounded-lg p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <Icons.linux className="w-6 h-6 text-fd-foreground" />
              </div>
              <h4 className="text-base font-semibold text-fd-foreground">Linux</h4>
            </div>
            {organized.linux.length > 0 ? (
              <div className="space-y-2 flex-grow">
                {organized.linux.map((asset) => (
                  <a
                    key={asset.name}
                    href={asset.downloadUrl}
                    className="flex items-center justify-between p-3 rounded border border-fd-border hover:bg-fd-secondary/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fd-foreground truncate">
                        {asset.label}
                      </p>
                      <p className="text-xs text-fd-muted-foreground">{asset.size}</p>
                    </div>
                    <Download className="w-4 h-4 text-fd-muted-foreground group-hover:text-fd-foreground ml-2 flex-shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-6 rounded border border-fd-border border-dashed flex-grow">
                <p className="text-sm text-fd-muted-foreground">Coming soon</p>
              </div>
            )}
          </div>
        </div>

        {/* View Release Notes */}
        <div className="pt-4 border-t border-fd-border">
          <Link
            href={release.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-400 transition-colors"
          >
            View release notes
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
