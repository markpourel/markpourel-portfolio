import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Песочница", template: "%s — песочница" },
  robots: { index: false, follow: false },
};

export default function LabRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          padding: "2rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          lineHeight: 1.5,
          background: "#fff",
          color: "#111",
        }}
      >
        {children}
      </body>
    </html>
  );
}
