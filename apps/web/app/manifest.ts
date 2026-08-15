import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Framer — bulk photo borders, captions & filters",
    short_name: "Framer",
    description:
      "Add borders, captions and filters to hundreds of photos at once, losslessly, without your photos ever leaving your machine.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1a1a",
    theme_color: "#1a1a1a",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
