import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "zoiudoAI — construtor de servidor",
  description: "Descreva seu servidor Discord em texto; a IA monta a estrutura.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
