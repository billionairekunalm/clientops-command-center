import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClientOps — Command Center",
  description: "The operating system for client relationships and delivery.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
