import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["latin", "hebrew"],
});

export const metadata: Metadata = {
  title: "DOCTOR SEARCH - מערכת חיפוש רופאים",
  description: "מערכת חיפוש רופאים מתקדמת",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
