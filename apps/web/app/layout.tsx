import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { SessionRestore } from "@/components/session-restore";

export const metadata: Metadata = {
  title: "Framer — bulk photo borders, captions & filters",
  description:
    "Add borders, captions and filters to hundreds of photos at once, losslessly, without your photos ever leaving your machine.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Framer",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PwaRegister />
        <SessionRestore />
      </body>
    </html>
  );
}
