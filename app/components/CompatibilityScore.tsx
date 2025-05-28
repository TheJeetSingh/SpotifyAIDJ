'use client';

import { useState } from 'react';

interface CompatibilityResult {
  score: number;
  metrics: {
    artistOverlap: number;
    genreOverlap: number;
    trackOverlap: number;
    audioFeaturesScore: number;
  };
  currentUser: {
    id: string;
    name: string;
    image?: string;
  };
  friendUser: {
    id: string;
    name: string;
    image?: string;
  };
}

export default function CompatibilityScore() {
  const [friendCode, setFriendCode] = useState('');
  const [userFriendCode, setUserFriendCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch the current user's friend code
  const fetchUserFriendCode = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/compatibility');
      
      if (!response.ok) {
        throw new Error('Failed to fetch your friend code');
      }
      
      const data = await response.json();
      setUserFriendCode(data.friendCode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate compatibility with another user
  const calculateCompatibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    
    if (!friendCode.trim()) {
      setError('Please enter a friend code');
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendCode: friendCode.trim() }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to calculate compatibility');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy friend code to clipboard
  const copyFriendCode = () => {
    navigator.clipboard.writeText(userFriendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-emerald-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get compatibility description
  const getCompatibilityDescription = (score: number) => {
    if (score >= 80) return 'Musical Soulmates';
    if (score >= 60) return 'Great Musical Match';
    if (score >= 40) return 'Decent Musical Overlap';
    if (score >= 20) return 'Different Musical Worlds';
    return 'Musical Opposites';
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-8">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Music Compatibility Score
        </h2>

        {/* Your Friend Code */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Your Friend Code</h3>
          
          {!userFriendCode ? (
            <button
              onClick={fetchUserFriendCode}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition duration-200 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Generate Your Friend Code'}
            </button>
          ) : (
            <div className="flex">
              <input
                type="text"
                value={userFriendCode}
                readOnly
                className="flex-1 py-2 px-4 border border-gray-300 rounded-l-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
              <button
                onClick={copyFriendCode}
                className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-r-lg shadow-md transition duration-200"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
          )}
          
          {copied && (
            <p className="text-sm text-green-600 mt-1">Copied to clipboard!</p>
          )}
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Share this code with a friend to calculate your music compatibility.
          </p>
        </div>

        {/* Calculate Compatibility Form */}
        <form onSubmit={calculateCompatibility} className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Check Compatibility</h3>
          
          <div className="flex mb-2">
            <input
              type="text"
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value)}
              placeholder="Enter friend's code"
              className="flex-1 py-2 px-4 border border-gray-300 rounded-l-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
            <button
              type="submit"
              disabled={isLoading || !friendCode.trim()}
              className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-r-lg shadow-md transition duration-200 disabled:opacity-50"
            >
              {isLoading ? 'Calculating...' : 'Compare'}
            </button>
          </div>
          
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          )}
        </form>

        {/* Results */}
        {result && (
          <div className="text-center">
            <div className="flex justify-center items-center mb-4">
              <div className="text-center mr-4">
                <div className="w-12 h-12 overflow-hidden rounded-full mx-auto bg-gray-200">
                  {result.currentUser.image ? (
                    <img src={result.currentUser.image} alt={result.currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-800 text-xl font-bold">
                      {result.currentUser.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-sm mt-1 font-medium text-gray-700 dark:text-gray-300">{result.currentUser.name}</p>
              </div>
              
              <div className={`text-5xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}%
              </div>
              
              <div className="text-center ml-4">
                <div className="w-12 h-12 overflow-hidden rounded-full mx-auto bg-gray-200">
                  {result.friendUser.image ? (
                    <img src={result.friendUser.image} alt={result.friendUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-100 text-purple-800 text-xl font-bold">
                      {result.friendUser.name.charAt(0)}
                    </div>
                  )}
                </div>
                <p className="text-sm mt-1 font-medium text-gray-700 dark:text-gray-300">{result.friendUser.name}</p>
              </div>
            </div>
            
            <p className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">
              {getCompatibilityDescription(result.score)}
            </p>

            {/* Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center mx-auto text-sm text-purple-600 hover:text-purple-800 transition duration-200"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
              <span className={`ml-1 transition-transform duration-200 ${showDetails ? 'transform rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* Detailed Metrics */}
            {showDetails && (
              <div className="mt-4 border-t border-gray-200 pt-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Artist Overlap</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {formatPercentage(result.metrics.artistOverlap)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Genre Overlap</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {formatPercentage(result.metrics.genreOverlap)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Track Overlap</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {formatPercentage(result.metrics.trackOverlap)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Musical Features</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {formatPercentage(result.metrics.audioFeaturesScore)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 