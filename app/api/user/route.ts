import { NextRequest, NextResponse } from 'next/server';
import spotifyApi from '@/lib/spotify';

// Define interfaces for Spotify API responses
interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

interface SpotifyUser {
  id: string;
  display_name: string;
  images: SpotifyImage[];
  // Add other user properties if needed
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  // Add other artist properties if needed
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: SpotifyImage[];
  };
  // Add other track properties if needed
}

interface SpotifyPlaylistItem {
  id: string;
  name: string;
  images: SpotifyImage[];
  // Add other playlist properties if needed
}

interface SpotifyRecentlyPlayedItem {
  track: SpotifyTrack;
  played_at: string;
  // context might be useful if you want to see where it was played from
}

// Generic type for Spotify API paged results
interface SpotifyPagedResponse<T> {
  body: {
    items: T[];
    // Add other pagination properties if needed (limit, offset, total, etc.)
  };
}

interface SpotifyUserResponse {
  body: SpotifyUser;
}

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated', details: 'Access token cookie missing.' }, { status: 401 });
  }

  try {
    spotifyApi.setAccessToken(accessToken);
    
    let userData: SpotifyUserResponse;
    let topTracks: SpotifyPagedResponse<SpotifyTrack>;
    let topArtists: SpotifyPagedResponse<SpotifyArtist>;
    let playlists: SpotifyPagedResponse<SpotifyPlaylistItem>;
    let recentTracks: SpotifyPagedResponse<SpotifyRecentlyPlayedItem>;

    try {
      userData = await spotifyApi.getMe() as SpotifyUserResponse;
    } catch (e: unknown) {
      const error = e as { body?: { error?: { message?: string } }, message?: string };
      console.error('Error fetching user profile:', error.body || error.message);
      throw new Error(`Failed to fetch user profile: ${error.body?.error?.message || error.message}`);
    }

    try {
      topTracks = await spotifyApi.getMyTopTracks({ limit: 50 }) as SpotifyPagedResponse<SpotifyTrack>;
    } catch (e: unknown) {
      const error = e as { body?: { error?: { message?: string } }, message?: string };
      console.error('Error fetching top tracks:', error.body || error.message);
      throw new Error(`Failed to fetch top tracks: ${error.body?.error?.message || error.message}`);
    }
    
    try {
      topArtists = await spotifyApi.getMyTopArtists({ limit: 20 }) as SpotifyPagedResponse<SpotifyArtist>;
    } catch (e: unknown) {
      const error = e as { body?: { error?: { message?: string } }, message?: string };
      console.error('Error fetching top artists:', error.body || error.message);
      throw new Error(`Failed to fetch top artists: ${error.body?.error?.message || error.message}`);
    }
    
    try {
      playlists = await spotifyApi.getUserPlaylists({ limit: 30 }) as SpotifyPagedResponse<SpotifyPlaylistItem>;
    } catch (e: unknown) {
      const error = e as { body?: { error?: { message?: string } }, message?: string };
      console.error('Error fetching playlists:', error.body || error.message);
      throw new Error(`Failed to fetch playlists: ${error.body?.error?.message || error.message}`);
    }
    
    try {
      recentTracks = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 }) as SpotifyPagedResponse<SpotifyRecentlyPlayedItem>;
    } catch (e: unknown) {
      const error = e as { body?: { error?: { message?: string } }, message?: string };
      console.error('Error fetching recent tracks:', error.body || error.message);
      throw new Error(`Failed to fetch recent tracks: ${error.body?.error?.message || error.message}`);
    }

    return NextResponse.json({
      user: userData.body,
      topTracks: topTracks.body.items,
      topArtists: topArtists.body.items,
      playlists: playlists.body.items,
      recentTracks: recentTracks.body.items,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error in /api/user route:', err.message);
    return NextResponse.json({ error: 'Failed to fetch comprehensive user data', details: err.message }, { status: 500 });
  }
} 