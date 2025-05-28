'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/ToastContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  FacebookShareButton, FacebookIcon,
  TwitterShareButton, TwitterIcon,
  RedditShareButton, RedditIcon,
  WhatsappShareButton, WhatsappIcon,
  TelegramShareButton, TelegramIcon,
  LinkedinShareButton, LinkedinIcon,
  PinterestShareButton, PinterestIcon,
  TumblrShareButton, TumblrIcon,
  EmailShareButton, EmailIcon,
  ViberShareButton, ViberIcon,
  LineShareButton, LineIcon
} from 'react-share';

interface RoastResponse {
  success: boolean;
  roasts: string[];
  topGenres: string[];
  topArtistNames: string[];
  topTrackNames: string[];
  isAiGenerated: boolean;
}

export default function RoastMyMusic() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [roastData, setRoastData] = useState<RoastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentRoastIndex, setCurrentRoastIndex] = useState(0);
  const [showShareOptions, setShowShareOptions] = useState(false);

  useEffect(() => {
    const fetchRoasts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/roast');
        
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/');
            return;
          }
          throw new Error('Failed to get music roasts');
        }
        
        const data = await response.json();
        
        // Check if there was an API quota error but fallback roasts were returned
        if (data.error && data.error.includes('quota') && data.roasts) {
          setRoastData(data);
          showToast('Using backup roasts - AI quota exceeded', 'warning');
        } else if (data.roasts) {
          setRoastData(data);
        } else {
          throw new Error('No roasts returned from server');
        }
      } catch (err) {
        console.error('Error fetching roasts:', err);
        setError('Failed to analyze your questionable music taste. Maybe that\'s for the best.');
        showToast('Error fetching roasts', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoasts();
  }, [router, showToast]);

  const handleNextRoast = () => {
    if (roastData && roastData.roasts.length > 0) {
      setCurrentRoastIndex((prevIndex) => 
        prevIndex === roastData.roasts.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevRoast = () => {
    if (roastData && roastData.roasts.length > 0) {
      setCurrentRoastIndex((prevIndex) => 
        prevIndex === 0 ? roastData.roasts.length - 1 : prevIndex - 1
      );
    }
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = 'My Spotify Roast';
  const shareText = roastData ? 
    `I just got roasted by ${roastData.isAiGenerated ? 'AI' : ''} on Spotify DJ! "${roastData.roasts[currentRoastIndex]}" Check it out at ${typeof window !== 'undefined' ? window.location.origin : ''}` 
    : '';
  const imagePath = typeof window !== 'undefined' ? `${window.location.origin}/spotify-logo.png` : '';

  const handleShare = () => {
    setShowShareOptions(true);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareText);
    showToast('Copied to clipboard! Now share your shame.', 'success');
  };

  const handleGoogleChatShare = () => {
    navigator.clipboard.writeText(shareText);
    showToast('Roast copied! Opening Google Chat for you to paste.', 'success');
    window.open('https://chat.google.com/', '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-6">Analyzing Your Questionable Music Taste...</h1>
          <LoadingSpinner size="lg" text="Preparing to roast you..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-lg text-center">
          <h1 className="text-3xl font-bold mb-4">Well, This Is Awkward</h1>
          <p className="text-xl mb-6">{error}</p>
          <button 
            onClick={handleBackToDashboard}
            className="bg-spotify-green text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <button 
          onClick={handleBackToDashboard}
          className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>

        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-gradient bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 bg-clip-text text-transparent">
            Roast My Music
          </h1>
          <p className="text-lg text-gray-400">
            We analyzed your music taste with {roastData?.isAiGenerated ? 'AI technology' : 'our algorithms'}, and... well... brace yourself.
          </p>
        </div>

        {roastData && (
          <div className="grid grid-cols-1 gap-8">
            {/* Main roast display */}
            <div className="bg-gradient-to-br from-gray-900 to-black p-6 sm:p-8 rounded-xl shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-2xl">🔥</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <h2 className="text-2xl font-bold mr-2">The Brutal Truth</h2>
                  {roastData?.isAiGenerated && (
                    <span className="inline-flex items-center px-2.5 py-0.5 mt-1 sm:mt-0 rounded-full text-xs font-medium bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      AI-Generated
                    </span>
                  )}
                </div>
              </div>
              
              <div className="min-h-[200px] flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-semibold mb-8 italic">
                    "{roastData.roasts[currentRoastIndex]}"
                  </p>
                  
                  <div className="flex justify-center space-x-4 mt-4">
                    <button 
                      onClick={handlePrevRoast}
                      className="bg-gray-800 p-3 rounded-full hover:bg-gray-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <button 
                      onClick={handleNextRoast}
                      className="bg-gray-800 p-3 rounded-full hover:bg-gray-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-4">
                    {currentRoastIndex + 1} of {roastData.roasts.length}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Evidence section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Top Genres */}
              <div className="bg-glass p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-4">The Genres You Claim to Enjoy</h3>
                <ul className="space-y-2">
                  {roastData.topGenres.map((genre, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-6 h-6 bg-spotify-green rounded-full flex items-center justify-center mr-3 text-xs">
                        {index + 1}
                      </span>
                      <span className="capitalize">{genre}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Top Artists */}
              <div className="bg-glass p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-4">Artists You Inexplicably Like</h3>
                <ul className="space-y-2">
                  {roastData.topArtistNames.map((artist, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-6 h-6 bg-spotify-green rounded-full flex items-center justify-center mr-3 text-xs">
                        {index + 1}
                      </span>
                      <span>{artist}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Top Tracks */}
              <div className="bg-glass p-6 rounded-xl">
                <h3 className="text-xl font-bold mb-4">Songs That Haunt Your History</h3>
                <ul className="space-y-2">
                  {roastData.topTrackNames.map((track, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-6 h-6 bg-spotify-green rounded-full flex items-center justify-center mr-3 text-xs">
                        {index + 1}
                      </span>
                      <span className="truncate">{track}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* Share button */}
            <div className="text-center mt-8 relative">
              <button 
                onClick={handleShare}
                className="bg-spotify-green text-white px-6 py-3 rounded-full font-semibold hover:bg-green-600 transition-colors"
              >
                Share This Roast
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Share your embarrassment with friends
              </p>

              {showShareOptions && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                  <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-lg">
                    <h3 className="text-xl font-bold mb-4 text-center">Share Your Roast</h3>
                    
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="flex flex-col items-center">
                        <FacebookShareButton url={shareUrl} hashtag="#SpotifyRoast">
                          <FacebookIcon size={40} round />
                          <span className="text-xs mt-1">Facebook</span>
                        </FacebookShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <TwitterShareButton url={shareUrl} title={shareText} hashtags={["SpotifyRoast"]}>
                          <TwitterIcon size={40} round />
                          <span className="text-xs mt-1">Twitter/X</span>
                        </TwitterShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <WhatsappShareButton url={shareUrl} title={shareText}>
                          <WhatsappIcon size={40} round />
                          <span className="text-xs mt-1">WhatsApp</span>
                        </WhatsappShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <TelegramShareButton url={shareUrl} title={shareText}>
                          <TelegramIcon size={40} round />
                          <span className="text-xs mt-1">Telegram</span>
                        </TelegramShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <RedditShareButton url={shareUrl} title={shareTitle}>
                          <RedditIcon size={40} round />
                          <span className="text-xs mt-1">Reddit</span>
                        </RedditShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <LinkedinShareButton url={shareUrl} title={shareTitle} summary={shareText} source="Spotify DJ AI">
                          <LinkedinIcon size={40} round />
                          <span className="text-xs mt-1">LinkedIn</span>
                        </LinkedinShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <PinterestShareButton url={shareUrl} description={shareText} media={imagePath}>
                          <PinterestIcon size={40} round />
                          <span className="text-xs mt-1">Pinterest</span>
                        </PinterestShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <TumblrShareButton url={shareUrl} title={shareTitle} caption={shareText}>
                          <TumblrIcon size={40} round />
                          <span className="text-xs mt-1">Tumblr</span>
                        </TumblrShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <button 
                          onClick={handleGoogleChatShare}
                          className="flex flex-col items-center text-white hover:text-gray-300 transition-colors"
                          aria-label="Share on Google Chat"
                        >
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="24" height="24">
                              <path fill="#00AC47" d="M 224.974 307.387 L 123.499 161.219 L 326.45 161.219 Z" />
                              <path fill="#0066DA" d="M 224.965 307.387 L 326.442 161.219 L 429.262 307.387 Z" />
                              <path fill="#EA4335" d="M 123.499 161.219 L 224.974 307.387 L 82.738 307.387 Z" />
                            </svg>
                          </div>
                          <span className="text-xs mt-1">Google Chat</span>
                        </button>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <LineShareButton url={shareUrl} title={shareText}>
                          <LineIcon size={40} round />
                          <span className="text-xs mt-1">Line</span>
                        </LineShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <ViberShareButton url={shareUrl} title={shareText}>
                          <ViberIcon size={40} round />
                          <span className="text-xs mt-1">Viber</span>
                        </ViberShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <EmailShareButton url={shareUrl} subject={shareTitle} body={shareText}>
                          <EmailIcon size={40} round />
                          <span className="text-xs mt-1">Email</span>
                        </EmailShareButton>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <button
                          onClick={handleCopyToClipboard}
                          className="bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span className="text-xs mt-1">Copy</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-700 pt-4 flex justify-end">
                      <button 
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition-colors"
                        onClick={() => setShowShareOptions(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 