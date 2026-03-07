import { getReleases } from "@/lib/github";
import { DownloadButton } from "./download-button";

export default async function Hero() {
  const releases = await getReleases();
  const latestRelease = releases.find((r) => r.isLatest);

  return (
    <section className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="inline-flex items-center rounded-full border border-fd-border bg-fd-secondary/50 px-3 py-1 text-sm text-fd-secondary-foreground mb-8 backdrop-blur-sm">
        <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
        Now available for download
      </div>

      <h1 className="text-4xl md:text-6xl leading-tight font-semibold tracking-tight text-fd-foreground mb-6 max-w-4xl">
        The <span className="font-serif italic font-normal">Cleanest</span>{" "}
        Database Management Tool <br className="hidden md:block" />
        <span className="text-fd-muted-foreground">
          You&apos;ve Been Waiting For
        </span>
      </h1>

      <p className="text-lg md:text-xl text-fd-muted-foreground max-w-2xl mb-10 leading-relaxed">
        Finally, a modern, intuitive and clean database client. Simple to
        explore, easy to edit, impossible to hate.
      </p>

      <DownloadButton assets={latestRelease?.assets} />
    </section>
  );
}
