import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { publicEnv } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: "LTR Growth — Your entire marketing department. Powered by AI.",
    template: "%s | LTR Growth",
  },
  description:
    "LTR Growth is the all-in-one AI marketing platform from LTRMarketing. Create better ads, improve your SEO, understand your competitors and grow your business from one dashboard.",
  applicationName: "LTR Growth",
  openGraph: {
    type: "website",
    siteName: "LTR Growth",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-fg">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: { background: "#171717", border: "1px solid #292929", color: "#fff" },
          }}
        />
      </body>
    </html>
  );
}
