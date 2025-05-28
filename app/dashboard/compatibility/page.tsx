import React from 'react';
import CompatibilityScore from '@/app/components/CompatibilityScore';

export default function CompatibilityPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Music Compatibility</h1>
      <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
        Compare your music taste with friends to see how compatible you are.
        Generate your code, share it with friends, and see who your musical soulmates are!
      </p>
      <CompatibilityScore />
    </div>
  );
} 