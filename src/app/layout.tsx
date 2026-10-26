import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import "./product-theme.css";

const lora = Lora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rotevo | Ecossistema de Crescimento",
  description: "Planejamento estratégico, inteligência de marketing e gestão do crescimento empresarial em um único ecossistema.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${lora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="rv-product min-h-full flex flex-col">{children}</body>
    </html>
  );
}
