import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

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
    { media: "(prefers-color-scheme: light)", color: "#f8f0dc" },
    { media: "(prefers-color-scheme: dark)", color: "#14201a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply a saved Light/Dark choice before first paint, so there's no flash. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('hh-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}" }} />
      </head>
      <body className="min-h-dvh antialiased">{children}<RegisterSW /></body>
    </html>
  );
}
