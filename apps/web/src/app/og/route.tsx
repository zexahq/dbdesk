import { ImageResponse } from "next/og";
import { OGCard } from "@/components/og-card";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
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
        title="The Cleanest Database Management Tool"
        subtitle="Manage your database with ease"
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
