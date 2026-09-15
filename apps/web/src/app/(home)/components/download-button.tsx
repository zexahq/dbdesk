'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { ArrowDownToLine } from 'lucide-react'

type OS = 'macos' | 'windows' | 'linux' | null

type Asset = {
  name: string
  browser_download_url: string
  size: number
}

type DownloadButtonProps = {
  assets?: Asset[]
}

function detectOS(): OS {
  if (typeof navigator === 'undefined') {
    return null
  }

  const ua = navigator.userAgent.toLowerCase()

  if (ua.includes('mac')) {
    return 'macos'
  }

  if (ua.includes('windows') || ua.includes('win')) {
    return 'windows'
  }

  if (ua.includes('linux') || ua.includes('x11')) {
    return 'linux'
  }

  return null
}

function subscribe() {
  return () => {}
}

function getDownloadUrl(assets: Asset[], os: OS): string | null {
  if (!assets?.length || !os) return null

  const patterns: Record<string, RegExp[]> = {
    macos: [/arm64.*\.dmg$/i, /\.dmg$/i, /darwin/i, /macos/i, /mac.*\.zip$/i],
    windows: [/\.exe$/i, /\.msi$/i, /windows/i, /win.*\.zip$/i],
    linux: [/\.AppImage$/i, /\.deb$/i, /linux/i]
  }

  const osPatterns = patterns[os]
  for (const pattern of osPatterns) {
    const asset = assets.find((a) => pattern.test(a.name))
    if (asset) return asset.browser_download_url
  }
  return null
}

export function DownloadButton({ assets = [] }: DownloadButtonProps) {
  const detectedOS = useSyncExternalStore(subscribe, detectOS, () => null)

  const osConfig = {
    macos: {
      label: 'Download for macOS (Apple silicon)'
    },
    windows: {
      label: 'Download for Windows'
    },
    linux: {
      label: 'Download for Linux'
    }
  }

  const config = detectedOS ? osConfig[detectedOS] : null
  const buttonText = config?.label || 'Download Now'

  if (!detectedOS) {
    return (
      <Link
        href="/download"
        className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-fd-primary text-fd-primary-foreground font-medium hover:opacity-90 transition-opacity"
      >
        <ArrowDownToLine aria-hidden="true" className="w-4 h-4" />
        Download Now
      </Link>
    )
  }

  const downloadUrl = getDownloadUrl(assets, detectedOS)

  if (downloadUrl) {
    return (
      <div className="flex flex-col items-center gap-4">
        <a
          href={downloadUrl}
          className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-fd-primary text-fd-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowDownToLine aria-hidden="true" className="w-4 h-4" />
          {buttonText}
        </a>

        {detectedOS === 'macos' && (
          <div className="text-sm text-fd-muted-foreground max-w-md w-full">
            <p className="text-center text-xs">
              Requires Apple silicon (M1 or newer). DBDesk is not yet Developer ID signed; Homebrew
              is the recommended install and update method.
            </p>
          </div>
        )}

        {detectedOS === 'linux' && (
          <div className="text-sm text-fd-muted-foreground max-w-md w-full">
            <p className="mb-2 text-center text-xs">For AppImage, make it executable:</p>
            <code
              className="block bg-fd-secondary/50 border border-fd-border p-2 rounded-lg text-xs select-all text-center"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              chmod +x dbdesk-*.AppImage && ./dbdesk-*.AppImage
            </code>
          </div>
        )}
      </div>
    )
  }

  // Fallback to /download page
  return (
    <div className="flex flex-col items-center gap-4">
      <Link
        href="/download"
        className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-fd-primary text-fd-primary-foreground font-medium hover:opacity-90 transition-opacity"
      >
        <ArrowDownToLine aria-hidden="true" className="w-4 h-4" />
        {buttonText}
      </Link>

      {detectedOS === 'macos' && (
        <div className="text-sm text-fd-muted-foreground max-w-md w-full">
          <p className="text-center text-xs">
            Requires Apple silicon (M1 or newer). DBDesk is not yet Developer ID signed; Homebrew is
            the recommended install and update method.
          </p>
        </div>
      )}

      {detectedOS === 'linux' && (
        <div className="text-sm text-fd-muted-foreground max-w-md w-full">
          <p className="mb-2 text-center text-xs">For AppImage, make it executable:</p>
          <code
            className="block bg-fd-secondary/50 border border-fd-border p-2 rounded-lg text-xs select-all text-center"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            chmod +x dbdesk-*.AppImage && ./dbdesk-*.AppImage
          </code>
        </div>
      )}
    </div>
  )
}
