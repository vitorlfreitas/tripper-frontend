"use client";
import { AuthButton } from "./AuthButton";

export function Navbar() {
  return (
    <header className="h-16 w-full bg-gray-200 shadow-sm flex items-center justify-between px-4 sm:px-8">
      <img src="/TRIPPER LOGO NO BG.png" alt="Tripper logo" className="sm:w-2/12 md:w-1/12" />
      <AuthButton />
    </header>
  );
}
