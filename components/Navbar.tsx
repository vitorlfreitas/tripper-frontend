"use client";
import { AuthButton } from "./AuthButton";

export function Navbar() {
  return (
    <header className="h-16 w-full bg-gray-200 shadow-sm flex items-center justify-between px-4 sm:px-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Tripper</h1>
      <AuthButton />
    </header>
  );
}
