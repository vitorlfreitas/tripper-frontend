'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { signIn } from 'next-auth/react';

export default function HomePage() {
  const [tripDetails, setTripDetails] = useState('');
  const [userName, setUserName] = useState('Vitor');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8080/trip-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripDetails, userName, generatePdf: true }),
      });

      if (!res.ok) throw new Error('Server Error');

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError('Failed to fetch recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (response?.pdfFileName) {
      const link = document.createElement('a');
      link.href = `http://localhost:8080/files/download/${response.pdfFileName}`;
      link.download = response.pdfFileName;
      link.target = '_blank';
      link.click();
    }
  };

  const handleLogin = () => {
    signIn('google', { callbackUrl: '/chat' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-grow flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-white text-center px-4">
        <div className='flex gap-5 items-center mb-8'>
          <img className='w-15' src="/tripper.png " alt="Tripper Icon" />
          <h2 className="text-4xl font-bold text-gray-800">Tripper Chatbot</h2>
        </div>
        <h1 className="text-6xl font-bold text-gray-800 mb-8">
          Perfect Outfits, Every Forecast
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Tell us about your trip, and our smart chatbot will suggest exactly what to pack.
        </p>
        <Button className="font-bold text-xl px-8 py-6" onClick={handleLogin}>
          Get Started
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 text-center">
        <p>&copy; {new Date().getFullYear()} Tripper. All rights reserved. Developed by <Link href={"#"} className='hover:text-sky-600 transition'>OurTeamName</Link></p>
      </footer>
    </div>
  );
}
