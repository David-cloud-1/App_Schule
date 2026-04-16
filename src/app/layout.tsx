import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpediLern – Prüfungsvorbereitung Speditionskaufleute",
  description: "Täglich lernen. Besser werden. IHK-Prüfung bestehen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
