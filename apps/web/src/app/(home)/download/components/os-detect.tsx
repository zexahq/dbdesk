"use client";

import { Icons } from "@/components/icons";
import Image from "next/image";
import { ArrowDownToLine } from "lucide-react";
import { useSyncExternalStore } from "react";

type OS = "macos" | "windows" | "linux" | null;

interface Asset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface OSDetectProps {
  assets?: Asset[];
}

function detectOS(): OS {
  if (typeof navigator === "undefined") {
    return null;
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("mac")) {
    return "macos";
  }

  if (ua.includes("windows") || ua.includes("win")) {
    return "windows";
  }

  if (ua.includes("linux") || ua.includes("x11")) {
    return "linux";
  }

  return null;
}

function subscribe() {
  return () => {};
}

function getDownloadUrl(assets: Asset[], os: OS): string | null {
  if (!assets.length || !os) return null;

  // Skip updater-only artifacts
  const installAssets = assets.filter(
    (a) => !a.name.includes(".blockmap") && !a.name.endsWith("-mac.zip")
  );

  const patterns: Record<string, RegExp[]> = {
    macos: [/\.dmg$/i, /darwin/i, /macos/i],
    windows: [/\.exe$/i, /\.msi$/i, /windows/i],
    linux: [/\.AppImage$/i, /\.deb$/i, /linux/i],
  };

  const osPatterns = patterns[os];
  for (const pattern of osPatterns) {
    const asset = installAssets.find((a) => pattern.test(a.name));
    if (asset) return asset.browser_download_url;
  }
  return null;
}

export function OSDetect({ assets = [] }: OSDetectProps) {
  const detectedOS = useSyncExternalStore(subscribe, detectOS, () => null);

  if (!detectedOS) {
    return null;
  }

  const osConfig = {
    macos: {
      icon: Icons.apple,
      name: "macOS",
      label: "Download for macOS",
    },
    windows: {
      icon: Icons.windows,
      name: "Windows",
      label: "Download for Windows",
    },
    linux: {
      icon: Icons.linux,
      name: "Linux",
      label: "Download for Linux",
    },
  };

  const config = detectedOS ? osConfig[detectedOS] : null;
  if (!config) return null;

  const downloadUrl = getDownloadUrl(assets, detectedOS);

  return (
    <div className="bg-fd-secondary/50 rounded-2xl p-8 mb-12">
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
        {/* App Icon */}
        <div className="w-24 h-24 md:w-28 md:h-28 flex-shrink-0 rounded-2xl bg-fd-background border border-fd-border shadow-lg overflow-hidden flex items-center justify-center">
          <Image
            src="/dbdesk-logo.svg"
            alt="dbdesk"
            width={80}
            height={80}
            className="w-16 h-16 md:w-20 md:h-20"
          />
        </div>

        {/* Content */}
        <div className="flex flex-col items-center md:items-start gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-fd-foreground to-fd-muted-foreground mb-2">
              Download DBDesk
            </h2>
            <p className="text-lg text-fd-muted-foreground">
              Available for macOS, Windows, and Linux.
            </p>
          </div>

          {downloadUrl ? (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-fd-foreground text-fd-background font-medium hover:opacity-90 transition-opacity"
            >
              {config.label}
              <ArrowDownToLine className="w-4 h-4" />
            </a>
          ) : (
            <a
              href="https://github.com/zexahq/dbdesk/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-fd-foreground text-fd-background font-medium hover:opacity-90 transition-opacity"
            >
              View Releases
              <ArrowDownToLine className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
