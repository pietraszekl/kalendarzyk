import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kompas Cyklu — Świadome planowanie podróży",
  description:
    "Plan podróży, który zna Twój rytm. Dni z mocą, dni do regeneracji i terminy cyklu — wszystko na jednym kalendarzu, lokalnie w przeglądarce.",
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
