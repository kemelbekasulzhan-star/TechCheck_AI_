import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'TechCheck AI — проверка документов оборудования', description: 'Сверка технического задания, предложения и паспорта электродвигателя с проверяемыми источниками.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
