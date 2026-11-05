import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "next-themes";

import { AuthProvider } from "@/contexts/AuthContext";
import HotkeysProvider from "@/contexts/HotkeysProvider";
import ReactQueryProvider from "@/contexts/ReactQueryProvider";
import { TerminologyProvider } from "@/contexts/TerminologyContext";
import { Toaster } from "@/components/ui/sonner";
import I18nProvider from "@/i18n/I18nProvider";
import { PRODUCT_ADMIN_CONSOLE_DESCRIPTION, PRODUCT_NAME } from "@/lib/productBranding";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_ADMIN_CONSOLE_DESCRIPTION,
  icons: { icon: "/get_favicon" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // next-themes stamps the theme class on <html> before paint, which the exported markup
    // cannot predict; suppressHydrationWarning confines that mismatch to this element.
    <html lang="zh-CN" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <I18nProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <NuqsAdapter>
              <ReactQueryProvider>
                <TerminologyProvider>
                  <HotkeysProvider>
                    <AuthProvider>{children}</AuthProvider>
                  </HotkeysProvider>
                </TerminologyProvider>
                <Toaster />
              </ReactQueryProvider>
            </NuqsAdapter>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
