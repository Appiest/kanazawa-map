import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/config";
import { hexOf } from "@/styles/palette";

export const alt = `${APP_NAME}, a map of Asian Americans across the country`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Scattered the way the pins actually cluster, rather than evenly spaced. */
const TAGS = [
  { x: 130, y: 208 }, { x: 178, y: 262 }, { x: 205, y: 172 }, { x: 246, y: 238 },
  { x: 300, y: 300 }, { x: 470, y: 158 }, { x: 560, y: 268 }, { x: 640, y: 206 },
  { x: 820, y: 128 }, { x: 900, y: 210 }, { x: 955, y: 166 }, { x: 1010, y: 240 },
  { x: 1048, y: 184 }, { x: 700, y: 334 }, { x: 380, y: 134 }, { x: 1090, y: 420 },
  { x: 990, y: 466 },
];

function Tag({ x, y }: { x: number; y: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: 34, height: 23, borderRadius: 4, background: hexOf("green", 600) }} />
      <div style={{ width: 3, height: 30, background: hexOf("green", 700) }} />
    </div>
  );
}

export default async function OpengraphImage() {
  const archivo = await readFile(join(process.cwd(), "assets/fonts/Archivo-Medium.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: hexOf("paper", 100),
          padding: 72,
          position: "relative",
        }}
      >
        {TAGS.map((tag) => (
          <Tag key={`${tag.x}-${tag.y}`} {...tag} />
        ))}
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ fontSize: 76, color: hexOf("paper", 900), letterSpacing: -1 }}>{APP_NAME}</div>
          <div style={{ fontSize: 34, color: hexOf("paper", 650), marginTop: 10 }}>
            Find Asian Americans near you, and let them find you.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Archivo", data: archivo, style: "normal", weight: 500 }] },
  );
}
