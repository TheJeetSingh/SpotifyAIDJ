'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
// import Image from 'next/image'; // Removed as it's unused
import { useRouter } from 'next/navigation';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy-loaded components with a direct path
const WaveAnimation = lazy(() => import('@/app/components/WaveAnimation'));

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activePattern, setActivePattern] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mark as hydrated
    setIsHydrated(true);
    
    // Trigger animation after component mounts
    setIsVisible(true);

    // Cycle through background patterns
    const interval = setInterval(() => {
      setActivePattern(prev => (prev + 1) % 3);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    try {
      setError(null);
      setIsLoading(true);
      router.push('/api/auth');
    } catch (err) {
      setIsLoading(false);
      setError('Failed to connect to Spotify. Please try again.');
      console.error('Login error:', err);
    }
  };

  const patterns = [
    { position: 'top-10 left-10', duration: '15s', delay: '0s', color: 'bg-spotify-green' },
    { position: 'bottom-10 right-10', duration: '20s', delay: '1s', color: 'bg-green-400' },
    { position: 'bottom-1/4 left-1/4', duration: '25s', delay: '2s', color: 'bg-blue-500' }
  ];

  return (
    <ErrorBoundary>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-black text-white relative overflow-y-auto overflow-x-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          {patterns.map((pattern, index) => (
            <div 
              key={index}
              className={`absolute w-80 sm:w-96 h-80 sm:h-96 opacity-10 rounded-full filter blur-[100px] animate-float 
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
          <Suspense fallback={<div className="absolute bottom-0 left-0 w-full h-16"></div>}>
            {isHydrated && <WaveAnimation />}
          </Suspense>
        </div>
        
        <div className={`max-w-4xl w-full text-center space-y-6 sm:space-y-12 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="mb-6 sm:mb-12 static">
            <div className="relative inline-block">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gradient animate-gradient bg-gradient-to-r from-green-400 via-green-500 to-green-300 pb-2">
                Spotify AI DJ
              </h1>
              <div className="absolute -top-8 -right-8 w-12 sm:w-16 h-12 sm:h-16 animate-float" style={{ animationDuration: '3s' }}>
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-full opacity-70 animate-pulse" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center text-xl sm:text-2xl">🎵</div>
                </div>
              </div>
            </div>
          
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mt-4 sm:mt-6 max-w-2xl mx-auto leading-relaxed">
              Your personal AI-powered DJ that creates the perfect playlists tailored to your unique music taste.
            </p>
          </div>
          
          <div className="mt-6 sm:mt-10 flex flex-col items-center">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-900/50 text-red-200 rounded-lg max-w-md">
                <p>{error}</p>
              </div>
            )}
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="flex items-center space-x-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-full transition-all duration-300 disabled:opacity-50 shadow-spotify hover:shadow-lg transform hover:-translate-y-1 active:translate-y-0"
              aria-label="Login with Spotify"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" text="" />
                  <span className="ml-2 text-base sm:text-lg">Connecting...</span>
                </div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-base sm:text-lg">Login with Spotify</span>
                </>
              )}
            </button>
          </div>
          
          <div className="mt-10 sm:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
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
              <div key={index} className={`bg-glass rounded-xl p-6 sm:p-8 shadow-spotify transition-all duration-500 transform hover-scale card-hover animate-fade-in`} style={{ animationDelay: `${index * 200}ms` }}>
                <div className="relative h-12 w-12 sm:h-14 sm:w-14 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg mx-auto">
                  <span className="text-lg sm:text-xl font-bold">{step.number}</span>
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-full animate-pulse opacity-70" style={{animationDuration: '3s'}}></div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 text-gradient">{step.title}</h3>
                <p className="text-sm sm:text-base text-gray-300">{step.description}</p>
              </div>
            ))}
          </div>
            
          <div className="mt-8 sm:mt-16 text-xs sm:text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Spotify AI DJ | Powered by Spotify API</p>
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}
