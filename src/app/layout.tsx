import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "poe2arb — Currency Exchange bid-ask",
  description:
    "Bid-ask spreads and arbitrage in the Path of Exile 2 Currency Exchange (Ange) market.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
