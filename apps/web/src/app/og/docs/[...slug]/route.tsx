import { getPageImage, source } from "@/lib/source";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { OGCard } from "@/components/og-card";
import { readFileSync } from "fs";
import { join } from "path";

export const revalidate = false;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const logoData = readFileSync(join(process.cwd(), "public/dbdesk-logo.svg"));
  const logoSrc = `data:image/svg+xml;base64,${logoData.toString("base64")}`;

  const fontData = await fetch(
    new URL(
      "https://cdn.jsdelivr.net/npm/@fontsource/plus-jakarta-sans@5.0.8/files/plus-jakarta-sans-latin-700-normal.woff",
      import.meta.url
    )
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <OGCard
        title={page.data.title}
        subtitle={page.data.description || "DBDesk Documentation"}
        brandName="DBDesk"
        logoSrc={logoSrc}
      />
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Plus Jakarta Sans",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
