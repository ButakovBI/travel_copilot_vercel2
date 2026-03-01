import type { Metadata } from "next";
import { Georama, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const georama = Georama({
  subsets: ["latin", "latin-ext"],
  variable: "--font-georama",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Т-Путешествия — бронирование туров и билетов",
  description: "Поиск и бронирование авиабилетов, отелей, поездов. AI Travel Copilot поможет подобрать лучший вариант.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${georama.variable} ${inter.variable}`}>
      <body className="min-h-screen font-sans antialiased bg-[var(--color-bg)]" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
