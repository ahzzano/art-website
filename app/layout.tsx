import type { Metadata } from "next";
import { Geist, Geist_Mono, Fredoka, Cantarell } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
     variable: "--font-fredoka-sans",
     subsets: ["latin"],
   });

const cantarell = Cantarell({
  variable: "--font-cantarell-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  robots: "noai, noimageai",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="talia"
      className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} ${cantarell.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
