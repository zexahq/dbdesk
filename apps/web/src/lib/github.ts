"use server";

import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
  isLatest: boolean;
}

export async function getReleases(): Promise<Release[]> {
  try {
    const response = await octokit.repos.listReleases({
      owner: "zexahq",
      repo: "dbdesk",
      per_page: 4,
    });

    return response.data
      .filter((release) => !release.draft && !release.prerelease)
      .slice(0, 4)
      .map((release, index) => ({
        id: release.id,
        tag_name: release.tag_name,
        name: release.name || release.tag_name,
        body: release.body || "",
        html_url: release.html_url,
        published_at: release.published_at || "",
        assets: release.assets.map((asset) => ({
          name: asset.name,
          browser_download_url: asset.browser_download_url,
          size: asset.size,
        })),
        isLatest: index === 0,
      }));
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    return [];
  }
}
