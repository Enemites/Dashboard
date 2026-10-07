import type { Metadata } from "next";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enemites · Internal Analytics",
  description: "Internal analytics for the Enemites landing page",
  robots: { index: false, follow: false }
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
