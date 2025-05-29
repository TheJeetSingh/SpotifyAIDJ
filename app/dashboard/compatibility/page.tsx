'use client';

import React from 'react';
import CompatibilityScore from '@/app/components/CompatibilityScore';
import { useRouter } from 'next/navigation';

export default function CompatibilityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-spotify-darker text-white p-4">
      <div className="container mx-auto">
        <button 
          onClick={() => router.push('/dashboard')}
          className="mb-6 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-full transition-colors duration-200 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
        
        <h1 className="text-3xl font-bold mb-6 text-center text-gradient">Music Compatibility</h1>
        <p className="text-center text-gray-400 mb-8 max-w-2xl mx-auto">
          Compare your music taste with friends to see how compatible you are.
          Generate your code, share it with friends, and see who your musical soulmates are!
        </p>
        <div className="bg-glass p-6 rounded-xl shadow-spotify">
          <CompatibilityScore />
        </div>
      </div>
    </div>
  );
} 