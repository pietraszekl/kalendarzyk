import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalendarzyk | Wyjazdy i prywatna prognoza cyklu",
  description:
    "Prywatny kalendarz wyjazdów z orientacyjną prognozą cyklu, zapisany lokalnie w przeglądarce.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
