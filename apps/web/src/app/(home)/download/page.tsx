import type { Metadata } from "next";
import { getReleases } from "@/lib/github";
import { ReleaseAccordion } from "./components/release-accordion";
import { OSDetect } from "./components/os-detect";

export const metadata: Metadata = {
  title: "Download dbdesk",
  description: "Download dbdesk for your operating system",
};

export const revalidate = 300; // revalidate every 5 minutes

export default async function DownloadPage() {
  const releases = await getReleases();
  const latestRelease = releases.find((r) => r.isLatest);

  return (
    <main className="min-h-screen bg-fd-background">
      <section className="py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <OSDetect assets={latestRelease?.assets} />

          {releases.length > 0 ? (
            <ReleaseAccordion releases={releases} />
          ) : (
            <div className="text-center py-12">
              <p className="text-fd-muted-foreground mb-6">
                Unable to fetch releases
              </p>
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
  );
}
