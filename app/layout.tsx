import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import "./theme.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext", "vietnamese"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Find Asian Americans near you, and let them find you.",
  openGraph: {
    title: APP_NAME,
    description: "Find Asian Americans near you, and let them find you.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#f3f1ed",
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
        <link rel="preload" href="/api/pins" as="fetch" crossOrigin="anonymous" />
      </head>
      <body className="bg-bg-page text-text-body antialiased">{children}</body>
    </html>
  );
}
