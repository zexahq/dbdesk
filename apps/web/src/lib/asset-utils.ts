export interface Asset {
  name: string;
  label: string;
  downloadUrl: string;
  size: string;
  os: "macos" | "windows" | "linux";
}

export interface OrganizedAssets {
  macos: Asset[];
  windows: Asset[];
  linux: Asset[];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function getAssetLabel(
  filename: string
): { label: string; os: "macos" | "windows" | "linux" } | null {
  // macOS
  if (filename.includes(".dmg")) {
    return { label: "macOS (DMG)", os: "macos" };
  }
  if (filename.includes("arm64") && filename.includes("mac")) {
    return { label: "macOS ARM64", os: "macos" };
  }

  // Windows
  if (filename.endsWith(".exe")) {
    return { label: "Windows (Installer)", os: "windows" };
  }

  // Linux
  if (filename.includes(".deb")) {
    return { label: "Linux (.deb)", os: "linux" };
  }
  if (filename.includes("AppImage")) {
    return { label: "Linux (AppImage)", os: "linux" };
  }

  return null;
}

export function organizeAssets(
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>
): OrganizedAssets {
  const organized: OrganizedAssets = {
    macos: [],
    windows: [],
    linux: [],
  };

  assets.forEach((asset) => {
    // Skip yml, blockmap, source code files, and updater-only artifacts
    if (
      asset.name.includes(".yml") ||
      asset.name.includes(".blockmap") ||
      asset.name.includes("latest") ||
      asset.name.includes("Source code") ||
      asset.name.endsWith("-mac.zip")
    ) {
      return;
    }

    const result = getAssetLabel(asset.name);
    if (result) {
      organized[result.os].push({
        name: asset.name,
        label: result.label,
        downloadUrl: asset.browser_download_url,
        size: formatFileSize(asset.size),
        os: result.os,
      });
    }
  });

  return organized;
}
