import type { MetadataRoute } from "next";

/** The map is behind a sign-in; the landing page is the one worth indexing. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/map" },
  };
}
