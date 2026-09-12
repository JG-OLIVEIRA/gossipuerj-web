import type { Metadata } from "next";
import "./globals.css";
import "./photo-background.css";

export const metadata: Metadata = {
  title: "Gossip UERJ",
  description: "Os bastidores, encontros e babados da UERJ.",
  openGraph: {
    title: "Gossip UERJ",
    description: "Os bastidores, encontros e babados da UERJ.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR"><body>{children}</body></html>
  );
}
