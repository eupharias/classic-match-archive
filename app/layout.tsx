import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"),
  title: "Wreqelodeon's League Classic Match Archive",
  description: "Performances, metrics, and memorable moments from the Rift.",
  openGraph: {
    title: "Wreqelodeon's League Classic Match Archive",
    description: "Performances, metrics, and memorable moments from the Rift.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wreqelodeon's League Classic Match Archive",
    description: "Performances, metrics, and memorable moments from the Rift.",
    images: ["/og.png"],
  },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
