"use client";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Navbar } from "@/components/Navbar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="bg-gray-100 h-full">
        <SessionProvider>
          <Navbar />
          {children}
          
        </SessionProvider>
      </body>
    </html>
  );
}

