import type { Metadata } from "next";
import "./globals.css";
import "./order-actions.css";

export const metadata: Metadata = {
  title: "E-DELIVERY | Ό,τι χρειάζεσαι, κοντά σου",
  description: "Ανακάλυψε φαγητό, supermarket και τοπικά καταστήματα με το E-DELIVERY."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="el"><body>{children}</body></html>;
}
