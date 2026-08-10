import type { Metadata } from "next";
import "./globals.css";
import "./sidebar.css";
import "./collections.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
  title: "Wreqelodeon's League Classic Match Archive",
  description: "Match histories, player performances, and memorable moments from the Classic Rift.",
  openGraph: {
    title: "Wreqelodeon's League Classic Match Archive",
    description: "Match histories, player performances, and memorable moments from the Classic Rift.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wreqelodeon's League Classic Match Archive",
    description: "Match histories, player performances, and memorable moments from the Classic Rift.",
    images: ["/og.png"],
  },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
