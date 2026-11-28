import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["500"], display: "swap" });

export const metadata: Metadata = {
  title: "Home Hollow",
  description: "Projects, improvements and maintenance for our home.",
  applicationName: "Home Hollow",
  appleWebApp: { capable: true, title: "Home Hollow", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#161513" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Per-request nonce from the proxy's Content-Security-Policy (reading headers also makes every page
  // dynamically rendered, which the nonce needs).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={`${figtree.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply a saved Light/Dark choice before first paint, so there's no flash. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('hh-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}" }} />
      </head>
      <body className="min-h-dvh antialiased">{children}<RegisterSW /></body>
    </html>
  );
}
