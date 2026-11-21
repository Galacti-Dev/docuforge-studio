import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocuForge Studio – Prywatny Kombajn PDF & DOCX',
  description: 'W pełni lokalne, bezpieczne narzędzie do manipulacji, konwersji, optymalizacji i analizy dokumentów PDF oraz DOCX.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className="dark">
      <body className="min-h-screen bg-[#141414] text-[#f1f1f1] antialiased selection:bg-[#3b82f6]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
