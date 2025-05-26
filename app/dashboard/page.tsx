'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '../components/ToastContext';
import Modal from '../components/Modal';

// Interfaces matching those in api/user/route.ts and api/dj/route.ts
interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

interface User {
  id: string;
  display_name: string;
  images: SpotifyImage[];
}

interface Artist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
}

interface Album {
  name: string;
  images: SpotifyImage[];
}

interface Track {
  id: string;
  name: string;
  artists: { id?: string; name: string }[]; // id is optional for artist in track context
  album: Album;
  uri?: string; // uri is optional here, main use is for seeds
}

interface PlaylistInfo {
  id: string;
  name: string;
  images: SpotifyImage[];
  external_urls?: { spotify?: string };
  // Add other playlist properties if needed from Spotify API
}

// Type for the `result` state, which holds data from /api/dj
interface DjResult {
  success: boolean;
  playlist: PlaylistInfo | null; // Playlist created on Spotify
  recommendations: string[]; // Raw AI string recommendations
  tracks: { name: string; artists: { name: string }[] }[]; // Simplified tracks for UI from AI
  spotifyTracks: Track[]; // Full Spotify track objects for tracks added to playlist
  explanation: string;
}

// Type for items in editablePlaylist (simplified from Track or DjResult.tracks)
interface EditablePlaylistItem {
  id?: string; // Might not have ID if it's a new unsaved recommendation
  name: string;
  artists: string[] | {name: string}[]; // artists can be string array or object array
  uri?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [recentTracks, setRecentTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [songCount, setSongCount] = useState<number>(10);
  const [mood, setMood] = useState('energetic');
  const [genre, setGenre] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<DjResult | null>(null); // Typed result state
  const [activeTab, setActiveTab] = useState('topTracks');
  const [visualizerActive, setVisualizerActive] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editablePlaylist, setEditablePlaylist] = useState<EditablePlaylistItem[]>([]); // Typed editable playlist
  const [saving, setSaving] = useState(false);
  const [playlistDetails, setPlaylistDetails] = useState<{id: string; name: string; url?: string} | null>(null); // url can be optional
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning'
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/');
            return;
          }
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        setUser(data.user as User);

        const uniqueTopTracks = (data.topTracks as Track[]).filter(
          (track: Track, index: number, self: Track[]) =>
            index === self.findIndex((t: Track) => t.id === track.id)
        ).slice(0, 50);
        setTopTracks(uniqueTopTracks);
        const topTrackIds = new Set(uniqueTopTracks.map((t: Track) => t.id));

        const uniqueRecentTracks: Track[] = [];
        const seenRecentTrackIds = new Set(); 
        if (data.recentTracks) {
          for (const playHistoryItem of data.recentTracks as { track: Track }[] ) {
            if (uniqueRecentTracks.length >= 50) break;
            
            const track = playHistoryItem.track;
            if (track && track.id && !topTrackIds.has(track.id) && !seenRecentTrackIds.has(track.id)) {
              uniqueRecentTracks.push(track);
              seenRecentTrackIds.add(track.id);
            }
          }
        }
        setRecentTracks(uniqueRecentTracks);
        
        setTopArtists(data.topArtists as Artist[] || []);
        
        showToast('Welcome to Spotify AI DJ', 'success');
      } catch (error) {
        console.error('Error fetching user data:', error);
        showToast('Failed to load your music data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router, showToast]);

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks(prev => 
      prev.includes(trackId)
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  const toggleArtistSelection = (artistId: string) => {
    setSelectedArtists(prev => 
      prev.includes(artistId)
        ? prev.filter(id => id !== artistId)
        : [...prev, artistId]
    );
  };

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setModalConfig({ title, message, type });
    setModalOpen(true);
  };

  const generateDJMix = async () => {
    if (selectedTracks.length === 0) {
      showModal('Selection Required', 'Please select at least one track to create a mix.', 'warning');
      return;
    }

    setGenerating(true);
    setResult(null);
    setPlaylistDetails(null);

    try {
      const response = await fetch('/api/dj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songIds: selectedTracks,
          selectedArtistIds: selectedArtists,
          mood,
          genre: genre || undefined,
          songCount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: 'Failed to generate DJ mix'}));
        throw new Error(errorData.error || 'Failed to generate DJ mix');
      }

      const data = await response.json() as DjResult;
      console.log('DJ API response:', data);
      
      setResult(data);
      
      if (data.playlist && data.playlist.id) {
        setPlaylistDetails({
          id: data.playlist.id,
          name: data.playlist.name,
          url: data.playlist.external_urls?.spotify
        });
        showToast('Your AI DJ Mix is ready!', 'success');
      } else {
        showModal('Playlist Creation Failed', 'Mix created but playlist could not be created on Spotify. You can still see the AI recommendations.', 'warning');
      }
    } catch (error) {
      console.error('Error generating DJ mix:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate your DJ mix. Please try again.';
      showModal('DJ Mix Error', message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const tracksToShow = activeTab === 'topTracks' ? topTracks : activeTab === 'recentTracks' ? recentTracks : [];

  const moodOptions = [
    'energetic', 'chill', 'party', 'focus', 'workout', 
    'happy', 'sad', 'romantic', 'nostalgic', 'upbeat',
    'relaxing', 'dreamy', 'intense', 'peaceful', 'dark'
  ];

  const genreOptions = [
    '', 'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'dance', 
    'indie', 'jazz', 'classical', 'folk', 'country', 'metal',
    'funk', 'soul', 'reggae', 'blues', 'ambient', 'disco', 'trap'
  ];

  const toggleVisualizer = () => {
    setVisualizerActive(!visualizerActive);
  };

  const enterEditMode = () => {
    if (result && Array.isArray(result.tracks)) {
      // Map tracks from result.tracks or result.spotifyTracks to EditablePlaylistItem
      const playlistToEdit: EditablePlaylistItem[] = result.spotifyTracks.length > 0 
        ? result.spotifyTracks.map(t => ({ 
            id: t.id, 
            name: t.name, 
            artists: t.artists.map(a => a.name), // Convert artist objects to string array
            uri: t.uri
          }))
        : result.tracks.map(t => ({ 
            name: t.name, 
            artists: t.artists.map(a => a.name) // Convert artist objects to string array
          }));
      setEditablePlaylist(playlistToEdit);
      setEditMode(true);
    }
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setEditablePlaylist([]);
  };

  const removeTrackFromPlaylist = (index: number) => {
    setEditablePlaylist(prev => prev.filter((_, i) => i !== index));
  };

  const moveTrackUp = (index: number) => {
    if (index === 0) return;
    setEditablePlaylist(prev => {
      const newPlaylist = [...prev];
      [newPlaylist[index], newPlaylist[index - 1]] = [newPlaylist[index - 1], newPlaylist[index]];
      return newPlaylist;
    });
  };

  const moveTrackDown = (index: number) => {
    if (index === editablePlaylist.length - 1) return;
    setEditablePlaylist(prev => {
      const newPlaylist = [...prev];
      [newPlaylist[index], newPlaylist[index + 1]] = [newPlaylist[index + 1], newPlaylist[index]];
      return newPlaylist;
    });
  };

  const savePlaylist = async () => {
    if (!result?.playlist?.id || editablePlaylist.length === 0) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/update-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId: result.playlist.id,
          tracks: editablePlaylist, // Sending EditablePlaylistItem[]
        }),
      });

      const data = await response.json();
      console.log('Update playlist response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update playlist');
      }
      
      // Assuming data.playlist is PlaylistInfo and data.trackCount is number
      const updatedPlaylistInfo = data.playlist as PlaylistInfo;

      setResult(prevResult => prevResult ? {
        ...prevResult,
        tracks: editablePlaylist.map(t => ({ // Update result.tracks to match current edit
            name: t.name, 
            artists: Array.isArray(t.artists) && t.artists.every(a => typeof a === 'string') 
                        ? (t.artists as string[]).map(name => ({name})) 
                        : t.artists as {name: string}[]
        })),
        playlist: updatedPlaylistInfo,
        // spotifyTracks might need re-fetching or careful updating if uris change order
        spotifyTracks: prevResult.spotifyTracks.filter(st => editablePlaylist.some(et => et.id === st.id))
                                              .sort((a,b) => editablePlaylist.findIndex(et => et.id === a.id) - editablePlaylist.findIndex(et => et.id === b.id)),
      } : null);
      
      setPlaylistDetails({
        id: updatedPlaylistInfo.id,
        name: updatedPlaylistInfo.name,
        url: updatedPlaylistInfo.external_urls?.spotify
      });
      
      showModal('Playlist Updated', `Your playlist has been updated with ${data.trackCount} tracks!`, 'success');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating playlist:', error);
      showModal('Update Error', `Failed to update playlist: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-spotify-darker text-white">
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 relative">
            <div className="absolute inset-0 bg-spotify-green rounded-full opacity-75 animate-ping"></div>
            <div className="relative h-16 w-16 bg-spotify-green rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" viewBox="0 0 168 168" fill="white">
                <path d="M83.996 0C37.747 0 0 37.746 0 84c0 46.251 37.747 84 83.996 84 46.254 0 84.004-37.749 84.004-84 0-46.254-37.75-84-84.004-84zm38.5 121.504c-1.5 2.5-4.75 3.25-7.25 1.75-19.75-12-44.5-14.75-73.75-8-2.75.75-5.5-1-6.25-3.75s1-5.5 3.75-6.25c32-7.25 59.5-4 81.75 9.5 2.5 1.5 3.25 4.75 1.75 7.25zm10.25-22.75c-2 3.25-6 4.25-9.25 2.25-22.5-13.75-56.75-17.75-83.5-9.75-3.5 1-7-1-8-4.25-1-3.5 1-7 4.25-8 30.5-9.25 68.25-4.75 94.5 11.5 3.25 2 4.25 6 2 9.25zm1-23.75c-27-16-71.5-17.5-97.25-9.75-4 1.25-8.25-1-9.5-5s1-8.25 5-9.5c29.75-9 79-7.25 110 11.5 3.75 2.25 5 7.25 2.75 11-2.25 3.75-7.25 5-11 2.75z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-xl font-medium text-gray-300">Loading your music...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-darker text-white">
      {/* Background gradient */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-spotify-dark to-transparent opacity-80"></div>
        <div className="absolute top-10 left-10 w-96 h-96 bg-spotify-green opacity-5 rounded-full filter blur-[100px]"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-green-400 opacity-5 rounded-full filter blur-[100px]"></div>
        
        {/* Music visualizer bars */}
        {visualizerActive && (
          <div className="absolute bottom-0 left-0 w-full h-24 flex items-end justify-center overflow-hidden">
            {[...Array(80)].map((_, i) => (
              <div 
                key={i}
                className="w-1 mx-px bg-spotify-green opacity-30 rounded-t-full animate-wave"
                style={{
                  height: `${Math.floor(Math.random() * 100)}%`, 
                  animationDuration: `${Math.random() * 0.5 + 0.3}s`,
                  animationDelay: `${i * 0.01}s`
                }}
              ></div>
            ))}
          </div>
        )}
      </div>

      {/* Header */}
      <header className="bg-glass backdrop-blur-md sticky top-0 z-10 border-b border-gray-800/50">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.images?.[0]?.url && (
              <div className="relative h-12 w-12 rounded-full overflow-hidden border-2 border-spotify-green shadow-spotify animate-pulse-spotify">
            <Image
              src={user.images[0].url}
              alt="Profile"
                  width={48}
                  height={48}
              className="rounded-full"
            />
              </div>
          )}
            <h1 className="text-xl font-semibold">Welcome, <span className="text-gradient">{user?.display_name}</span></h1>
        </div>
        <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gradient animate-gradient">
              Spotify AI DJ
          </h2>
            <div className="flex space-x-2">
          <button 
                onClick={toggleVisualizer} 
                className={`p-2 rounded-full transition-all ${visualizerActive ? 'bg-spotify-green text-white shadow-spotify' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                title="Toggle music visualizer"
          >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
          </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Track Selection */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-glass rounded-xl p-4 shadow-spotify">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Select Tracks & Artists</h3>
                <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button 
                onClick={() => setActiveTab('topTracks')} 
                    className={`px-4 py-2 text-sm ${activeTab === 'topTracks' ? 'bg-spotify-green text-white' : 'bg-spotify-dark text-gray-300 hover:bg-spotify-gray'} transition-all`}
              >
                    Top Tracks
              </button>
              <button 
                onClick={() => setActiveTab('recentTracks')} 
                    className={`px-4 py-2 text-sm ${activeTab === 'recentTracks' ? 'bg-spotify-green text-white' : 'bg-spotify-dark text-gray-300 hover:bg-spotify-gray'} transition-all`}
              >
                    Recent Tracks
              </button>
                  <button 
                    onClick={() => setActiveTab('topArtists')}
                    className={`px-4 py-2 text-sm ${activeTab === 'topArtists' ? 'bg-spotify-green text-white' : 'bg-spotify-dark text-gray-300 hover:bg-spotify-gray'} transition-all`}
                  >
                    Top Artists
                  </button>
            </div>
          </div>
          
              {/* Track & Artist Selection */}
              <div className="overflow-y-auto max-h-[60vh] pr-2">
                {activeTab === 'topArtists' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {topArtists.map((artist) => (
                <div 
                  key={artist.id}
                        onClick={() => toggleArtistSelection(artist.id)}
                        className={`rounded-lg p-3 hover-scale cursor-pointer transition-all duration-200 ${
                    selectedArtists.includes(artist.id) 
                            ? 'bg-gradient-to-br from-green-900/60 to-green-800/60 border border-green-500/50' 
                            : 'bg-spotify-dark/60 hover:bg-spotify-dark border border-transparent'
                  }`}
                >
                        <div className="aspect-square w-full relative rounded-md overflow-hidden mb-2 shadow-md">
                          {artist.images?.[0]?.url ? (
                    <Image
                      src={artist.images[0].url}
                      alt={artist.name}
                              fill
                              className="object-cover"
                    />
                          ) : (
                            <div className="w-full h-full bg-spotify-gray flex items-center justify-center">
                              <span className="text-3xl">🎵</span>
                            </div>
                  )}
                  {selectedArtists.includes(artist.id) && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="h-8 w-8 rounded-full bg-spotify-green flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                            </div>
                          )}
                        </div>
                        <h4 className="text-sm font-medium truncate">{artist.name}</h4>
                        {artist.genres?.length > 0 && (
                          <p className="text-xs text-gray-400 truncate">{artist.genres[0]}</p>
                  )}
                </div>
              ))}
            </div>
                ) : (
                  <div>
                    {tracksToShow.map((track) => (
                      <div 
                        key={track.id}
                        onClick={() => toggleTrackSelection(track.id)}
                        className={`mb-2 p-3 rounded-lg flex items-center gap-3 cursor-pointer hover-scale transition-all duration-200 ${
                          selectedTracks.includes(track.id) 
                            ? 'bg-gradient-to-r from-green-900/60 to-green-800/60 border border-green-500/50' 
                            : 'bg-spotify-dark/60 hover:bg-spotify-dark border border-transparent'
                        }`}
                      >
                        <div className="relative h-12 w-12 shrink-0 rounded overflow-hidden shadow-md">
                          {track.album?.images?.[0]?.url ? (
                            <Image
                              src={track.album.images[0].url}
                              alt={track.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-spotify-gray flex items-center justify-center">
                              <span>🎵</span>
                            </div>
                          )}
                          {selectedTracks.includes(track.id) && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="h-6 w-6 rounded-full bg-spotify-green flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{track.name}</p>
                          <p className="text-sm text-gray-400 truncate">
                            {track.artists?.map(a => a.name).join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Settings & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* DJ Settings Panel */}
            <div className="bg-glass rounded-xl p-5 shadow-spotify border border-gray-800/50">
              <h3 className="text-xl font-bold mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-spotify-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-gradient">DJ Settings</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Number of Songs</label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="5"
                      max="20"
                      value={songCount}
                      onChange={(e) => setSongCount(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="ml-3 bg-spotify-green/20 px-2 py-1 min-w-[40px] text-center rounded-md border border-spotify-green/30">
                      {songCount}
                    </span>
          </div>
        </div>

            <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Mood</label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                    className="w-full p-2.5 bg-spotify-dark border border-gray-700 rounded-lg focus:ring-spotify-green focus:border-spotify-green hover:border-spotify-green/70 transition-colors"
              >
                    {moodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Genre (Optional)</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                    className="w-full p-2.5 bg-spotify-dark border border-gray-700 rounded-lg focus:ring-spotify-green focus:border-spotify-green hover:border-spotify-green/70 transition-colors"
              >
                    {genreOptions.map((option) => (
                  <option key={option} value={option}>
                        {option ? option.charAt(0).toUpperCase() + option.slice(1) : 'Any Genre'}
                  </option>
                ))}
              </select>
            </div>
            
                <div className="pt-2">
                  <button
                    onClick={generateDJMix}
                    disabled={generating || selectedTracks.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-spotify-green to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 shadow-spotify"
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Creating Your Mix...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Generate DJ Mix</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Selection Summary */}
            <div className="bg-glass rounded-xl p-5 shadow-spotify border border-gray-800/50">
              <h3 className="text-xl font-bold mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-spotify-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-gradient">Your Selection</span>
              </h3>
              <div className="space-y-2">
                <p className="text-sm flex items-center">
                  <span className="w-28 text-gray-400">Selected Tracks:</span> 
                  <span className="bg-spotify-green/20 px-2 py-0.5 rounded-md border border-spotify-green/30 font-medium">
                    {selectedTracks.length}
                  </span>
                </p>
                <p className="text-sm flex items-center">
                  <span className="w-28 text-gray-400">Selected Artists:</span> 
                  <span className="bg-spotify-green/20 px-2 py-0.5 rounded-md border border-spotify-green/30 font-medium">
                    {selectedArtists.length}
                  </span>
                </p>
                <p className="text-sm flex items-center">
                  <span className="w-28 text-gray-400">Mood:</span> 
                  <span className="bg-spotify-green/20 px-2 py-0.5 rounded-md border border-spotify-green/30 font-medium">
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </span>
                </p>
                <p className="text-sm flex items-center">
                  <span className="w-28 text-gray-400">Genre:</span> 
                  <span className="bg-spotify-green/20 px-2 py-0.5 rounded-md border border-spotify-green/30 font-medium">
                    {genre ? (genre.charAt(0).toUpperCase() + genre.slice(1)) : 'Any'}
                  </span>
                </p>
                <p className="text-sm flex items-center">
                  <span className="w-28 text-gray-400">Song Count:</span> 
                  <span className="bg-spotify-green/20 px-2 py-0.5 rounded-md border border-spotify-green/30 font-medium">
                    {songCount}
                  </span>
                </p>
              </div>
            </div>
            
            {/* Results Panel */}
            {result && Array.isArray(result.tracks) && (
              <div className="bg-glass rounded-xl p-5 shadow-spotify animate-fade-in border border-gray-800/50">
                <h3 className="text-xl font-bold mb-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-spotify-green animate-pulse-spotify" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-gradient">Your AI DJ Mix</span>
                    {!result.playlist && (
                      <span className="ml-2 text-xs bg-yellow-800 text-yellow-200 px-2 py-0.5 rounded-full">
                        Playlist data missing
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editMode ? (
                      <>
                        <button 
                          onClick={savePlaylist}
                          disabled={saving || !result?.playlist?.id}
                          className="text-xs bg-gradient-to-r from-green-600 to-spotify-green hover:from-green-700 hover:to-green-600 text-white py-1 px-3 rounded-full flex items-center disabled:opacity-50 shadow-spotify transition-all"
                        >
                          {saving ? (
                            <>
                              <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving
                            </>
                          ) : (
                            <>Save</>
                          )}
                        </button>
                        <button 
                          onClick={cancelEditMode}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded-full transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={enterEditMode}
                        className="text-xs bg-glass hover:bg-gray-700 text-white py-1 px-3 rounded-full flex items-center shadow-sm hover:shadow-md transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </button>
                    )}
                    {result.playlist && !editMode && (
                      <a 
                        href={result.playlist.external_urls?.spotify} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs bg-glass hover:bg-gray-700 text-white py-1 px-3 rounded-full flex items-center shadow-sm hover:shadow-md transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open in Spotify
                      </a>
                    )}
                  </div>
                </h3>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-300">{result.explanation}</p>
                  {result.playlist && !editMode && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <p className="text-sm text-gray-300 flex items-center gap-2">
                        <span className="text-gray-400">Playlist:</span> 
                        <span className="font-medium text-gradient">{result.playlist.name}</span>
                      </p>
                    </div>
                  )}
                  {!result.playlist && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <p className="text-xs text-yellow-400">
                        Note: The playlist couldn&apos;t be created on Spotify. You can still see the AI recommendations but cannot edit them.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="overflow-y-auto max-h-[40vh] pr-2 mt-4">
                  {editMode ? (
                    // Editable playlist view
                    editablePlaylist.map((track: EditablePlaylistItem, index: number) => (
                      <div key={track.id || index} className="mb-3 p-3 bg-spotify-dark/80 rounded-lg flex items-center gap-3 hover-scale transition-all duration-200 border border-gray-800/50">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-spotify-green/20 text-white shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{track.name}</p>
                          <p className="text-sm text-gray-400 truncate">
                            {Array.isArray(track.artists) 
                              ? track.artists.map(a => typeof a === 'string' ? a : a.name).join(', ') 
                              : ''}
                          </p>
                        </div>
                        <div className="flex space-x-1 shrink-0">
                          <button 
                            onClick={() => moveTrackUp(index)}
                            disabled={index === 0}
                            className={`p-1.5 rounded-full text-white ${index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-700'} transition-colors`}
                            title="Move up"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => moveTrackDown(index)}
                            disabled={index === editablePlaylist.length - 1}
                            className={`p-1.5 rounded-full text-white ${index === editablePlaylist.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-700'} transition-colors`}
                            title="Move down"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
              <button
                            onClick={() => removeTrackFromPlaylist(index)}
                            className="p-1.5 rounded-full text-white hover:bg-red-700 transition-colors"
                            title="Remove"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
              </button>
            </div>
          </div>
                    ))
                  ) : (
                    // Regular playlist view (uses result.tracks or result.spotifyTracks)
                    (result?.spotifyTracks?.length > 0 ? result.spotifyTracks : result?.tracks || []).map((track: Track | {name: string, artists: {name: string}[]}, index: number) => (
                      <div 
                        key={(track as Track).id || index} 
                        className="mb-3 p-3 bg-spotify-dark/80 rounded-lg flex items-center gap-3 hover-scale transition-all duration-200 border border-gray-800/50"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-spotify-green/20 text-white shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{track.name}</p>
                          <p className="text-sm text-gray-400 truncate">
                            {Array.isArray(track.artists) ? track.artists.map(a => a.name).join(', ') : ''}
                          </p>
                        </div>
                        {visualizerActive && (
                          <div className="flex items-end h-8 space-x-0.5">
                            {[...Array(4)].map((_, i) => (
                              <div 
                                key={i}
                                className="w-1 bg-spotify-green animate-wave rounded-t-full"
                                style={{
                                  height: `${Math.floor(Math.random() * 100)}%`,
                                  animationDuration: `${Math.random() * 0.5 + 0.3}s`,
                                  animationDelay: `${i * 0.1}s`
                                }}
                              ></div>
                            ))}
                          </div>
                        )}
        </div>
                    ))
                  )}
      </div>

                {playlistDetails && !editMode && (
                  <div className="mt-4 pt-4 border-t border-gray-700 flex justify-center">
                    <a 
                      href={playlistDetails.url}
                  target="_blank"
                  rel="noopener noreferrer"
                      className="bg-gradient-to-r from-spotify-green to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium py-2 px-6 rounded-full flex items-center transition-all shadow-spotify"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Listen on Spotify
                </a>
              </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal component */}
      {modalOpen && (
        <Modal
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
} 