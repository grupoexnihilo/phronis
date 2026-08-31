// src/app/layout.jsx
import './global.css';

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>
        {/* O 'children' é onde o seu page.jsx será renderizado */}
        {children}
      </body>
    </html>
  );
}

export const metadata = {
  title: 'Phronis Terminal • Engenharia de Operações',
  description: 'Sistema de Análise Preditiva e Gestão de Operações',
  icons: {
    icon: '/avatar.png',
    shortcut: '/avatar.png',
    apple: '/avatar.png',
  },
};