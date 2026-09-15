import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeanOS | Gestão de melhoria contínua",
  description: "Medição de processos, identificação de gargalos e acompanhamento de melhorias.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
