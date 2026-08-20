import type { Metadata } from "next";
import { QueryProvider } from "@/lib/query/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReelHire",
  description: "A video-first hiring workflow built around real project challenges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
