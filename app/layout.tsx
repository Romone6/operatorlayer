import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OperatorLayer",
    template: "%s | OperatorLayer",
  },
  description: "Open-source communication governance for AI-assisted work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="h-full antialiased"><body className="min-h-full flex flex-col bg-[var(--color-background)] text-[var(--color-text-main)]">{children}</body></html>;
}
