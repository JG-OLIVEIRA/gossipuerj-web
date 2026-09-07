import type { Metadata } from "next";
import "./globals.css";
import "./photo-background.css";

export const metadata: Metadata = {
  title: "Gossip UERJ | A fonte não oficial do campus",
  description: "Os bastidores, encontros e babados da UERJ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR"><body>{children}</body></html>
  );
}
