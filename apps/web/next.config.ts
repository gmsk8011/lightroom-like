import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lrl/engine", "@lrl/ui"],
  async headers() {
    return [
      {
        // wasm-vips uses threads, which need SharedArrayBuffer, which needs
        // the page to be cross-origin isolated. Without these the export
        // pipeline silently falls back to single-threaded decoding.
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
