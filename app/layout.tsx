import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./theme.css";

const archivo = Archivo({
  subsets: ["latin", "latin-ext", "vietnamese"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Kanazawa",
  description:
    "A map of Asian Americans across the country. Drop a pin where you are and see who else is nearby.",
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
