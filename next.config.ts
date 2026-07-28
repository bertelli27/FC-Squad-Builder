import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Wildcard hostname, not just the known API CDNs: custom players/coaches/
    // squad badges accept an arbitrary user-pasted photo URL (ogol,
    // transfermarkt, imgur, wikipedia, whatever), and next/image throws a
    // hard 500 — not a graceful fallback — for any host missing here.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
