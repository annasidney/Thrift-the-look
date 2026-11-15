import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import { inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "ThriftTheLook | Shop any outfit at every budget",
  description:
    "Turn any outfit photo into a shoppable look at thrift, mid and premium budgets, with prices in ₹.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Header />
        {children}
      </body>
    </html>
  );
}