import type { Metadata } from "next";
import "./globals.css";
import "./order-actions.css";

export const metadata: Metadata = {
  title: "Delivery Operations",
  description: "Operations and merchant workspace for the Greek delivery platform."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="el"><body>{children}</body></html>;
}
