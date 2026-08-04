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