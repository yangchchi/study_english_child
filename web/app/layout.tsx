import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "单词抓抓乐",
  description: "小学生英语三返昼夜学习 · 轻松高效抓单词",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "单词抓抓乐",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#7dd3fc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${fredoka.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
