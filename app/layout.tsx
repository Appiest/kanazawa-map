import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import { SITE } from "@/lib/content";
import { hexOf } from "@/styles/palette";
import { apiPath, BASE_PATH } from "@/lib/paths";
import "./theme.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext", "vietnamese"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

const PUBLIC_ORIGIN = process.env.NEXT_PUBLIC_HOST_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  // Includes the base path, so the Open Graph image resolves under /counts.
  ...(PUBLIC_ORIGIN ? { metadataBase: new URL(`${PUBLIC_ORIGIN.replace(/\/+$/, "")}${BASE_PATH}`) } : {}),
  title: APP_NAME,
  description: SITE.tagline,
  openGraph: {
    title: APP_NAME,
    description: SITE.tagline,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: hexOf("brand", 900),
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/** Only a basemap on another host is worth a preconnect; a local file is not. */
function remoteOrigin(url: string | undefined): string | null {
  if (!url?.startsWith("http")) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const TILE_ORIGIN = remoteOrigin(process.env.NEXT_PUBLIC_TILE_URL);
const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <head>
        {TILE_ORIGIN ? <link rel="preconnect" href={TILE_ORIGIN} crossOrigin="anonymous" /> : null}
        {SUPABASE_ORIGIN ? <link rel="preconnect" href={SUPABASE_ORIGIN} /> : null}
        <link rel="preload" href={apiPath("/pins")} as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="bg-bg-page text-text-body antialiased">{children}</body>
    </html>
  );
}
