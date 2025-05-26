'use client';

import { useState, useEffect } from 'react';
// import Image from 'next/image'; // Removed as it's unused
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activePattern, setActivePattern] = useState(0);

  useEffect(() => {
    // Trigger animation after component mounts
    setIsVisible(true);

    // Cycle through background patterns
    const interval = setInterval(() => {
      setActivePattern(prev => (prev + 1) % 3);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    setIsLoading(true);
    router.push('/api/auth');
  };

  const patterns = [
    { position: 'top-10 left-10', duration: '15s', delay: '0s', color: 'bg-spotify-green' },
    { position: 'bottom-10 right-10', duration: '20s', delay: '1s', color: 'bg-green-400' },
    { position: 'bottom-1/4 left-1/4', duration: '25s', delay: '2s', color: 'bg-blue-500' }
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        {patterns.map((pattern, index) => (
          <div 
            key={index}
            className={`absolute w-96 h-96 opacity-10 rounded-full filter blur-[100px] animate-float 
                      ${pattern.color} 
                      ${pattern.position} 
                      ${index === activePattern ? 'opacity-20' : 'opacity-10'}`}
            style={{
              animationDuration: pattern.duration,
              animationDelay: pattern.delay,
              transition: 'opacity 1s ease-in-out'
            }}
          ></div>
        ))}
        
        {/* Sound wave visualization effect */}
        <div className="absolute bottom-0 left-0 w-full h-16 flex items-end justify-center">
          {[...Array(40)].map((_, i) => (
            <div 
              key={i} 
              className="w-1 mx-px bg-spotify-green opacity-20 rounded-t-full animate-wave"
              style={{
                height: `${Math.floor(Math.random() * 60) + 10}%`,
                animationDelay: `${i * 0.05}s`,
                animationDuration: `${Math.random() * 0.7 + 0.5}s`
              }}
            ></div>
          ))}
        </div>
      </div>
      
      <div className={`max-w-4xl w-full text-center space-y-12 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-12">
          <div className="relative inline-block">
            <h1 className="text-7xl font-bold tracking-tight text-gradient animate-gradient bg-gradient-to-r from-green-400 via-green-500 to-green-300 pb-2">
              Spotify AI DJ
        </h1>
            <div className="absolute -top-8 -right-8 w-16 h-16 animate-float" style={{ animationDuration: '3s' }}>
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-full opacity-70 animate-pulse" style={{ animationDuration: '2s' }}></div>
                <div className="absolute inset-0 flex items-center justify-center text-2xl">🎵</div>
              </div>
            </div>
          </div>
        
          <p className="text-2xl text-gray-300 mt-6 max-w-2xl mx-auto leading-relaxed">
            Your personal AI-powered DJ that creates the perfect playlists tailored to your unique music taste.
        </p>
        </div>
        
        <div className="mt-10 flex justify-center">
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="flex items-center space-x-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-4 px-8 rounded-full transition-all duration-300 disabled:opacity-50 shadow-spotify hover:shadow-lg transform hover:-translate-y-1 active:translate-y-0"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-lg">Connecting...</span>
              </div>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-lg">Login with Spotify</span>
              </>
            )}
          </button>
        </div>
        
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              number: 1,
              title: "Connect Your Spotify",
              description: "Login with your Spotify account to access your music library and listening history."
            },
            {
              number: 2,
              title: "Select Your Vibe",
              description: "Choose your favorite songs, set the mood, and select your preferred genre for the perfect mix."
            },
            {
              number: 3,
              title: "Get AI-Powered Mixes",
              description: "Our AI DJ creates personalized playlists that match your selections and music preferences."
            }
          ].map((step, index) => (
            <div key={index} className={`bg-glass rounded-xl p-8 shadow-spotify transition-all duration-500 transform hover-scale card-hover animate-fade-in`} style={{ animationDelay: `${index * 200}ms` }}>
              <div className="relative h-14 w-14 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-6 shadow-lg mx-auto">
                <span className="text-xl font-bold">{step.number}</span>
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-full animate-pulse opacity-70" style={{animationDuration: '3s'}}></div>
            </div>
              <h3 className="text-xl font-semibold mb-3 text-gradient">{step.title}</h3>
              <p className="text-gray-300">{step.description}</p>
            </div>
          ))}
          </div>
          
        <div className="mt-16 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Spotify AI DJ | Powered by Spotify API</p>
        </div>
      </div>
    </main>
  );
}
