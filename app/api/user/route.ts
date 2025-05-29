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

interface SpotifyErrorBody {
  error: {
    status: number;
    message: string;
  };
}

// Updated helper function to handle Spotify API errors
const handleSpotifyApiError = (e: unknown, operationName: string): Error => {
  const error = e as { statusCode?: number; body?: SpotifyErrorBody | Record<string, unknown>; message?: string }; // Allow body to be generic empty object
  let details = `Spotify API error during ${operationName}`;

  if (error.statusCode) {
    details += ` - Status ${error.statusCode}`;
  }

  // Check for standard Spotify error structure first
  if (error.body && (error.body as SpotifyErrorBody).error && (error.body as SpotifyErrorBody).error.message) {
    details += `: ${(error.body as SpotifyErrorBody).error.message}`;
  } else if (error.message) { // Fallback to top-level error message if any
    details += `: ${error.message}`;
  } else if (error.statusCode === 403 && Object.keys(error.body || {}).length === 0) {
    details += `: Forbidden (403) with empty error body. This often means the user is not registered in the Spotify Developer Dashboard for this app.`;
  } else if (error.body && Object.keys(error.body).length > 0) {
    // If body is not empty but doesn't match SpotifyErrorBody, stringify it
    details += `: Unexpected error body: ${JSON.stringify(error.body)}`;
  } else if (error.statusCode) {
    details += `: Received status ${error.statusCode} with no further details.`;
  }
  
  console.error(`Error during ${operationName}:`, JSON.stringify(error, null, 2));
  return new Error(details); // Return an Error object
};

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated', details: 'Access token cookie missing.' }, { status: 401 });
  }

  try {
    spotifyApi.setAccessToken(accessToken);
    
    // Critical data: if these fail, we cannot proceed.
    let userData: SpotifyUserResponse;
    let topTracks: SpotifyPagedResponse<SpotifyTrack>;
    let topArtists: SpotifyPagedResponse<SpotifyArtist>;

    try {
      userData = await spotifyApi.getMe() as SpotifyUserResponse;
    } catch (e: unknown) {
      throw handleSpotifyApiError(e, 'fetching user profile (getMe)');
    }

    try {
      topTracks = await spotifyApi.getMyTopTracks({ limit: 50 }) as SpotifyPagedResponse<SpotifyTrack>;
    } catch (e: unknown) {
      throw handleSpotifyApiError(e, 'fetching top tracks (getMyTopTracks)');
    }
    
    try {
      topArtists = await spotifyApi.getMyTopArtists({ limit: 20 }) as SpotifyPagedResponse<SpotifyArtist>;
    } catch (e: unknown) {
      throw handleSpotifyApiError(e, 'fetching top artists (getMyTopArtists)');
    }
    
    // Non-critical data: default to empty arrays if fetching fails.
    let playlists: SpotifyPagedResponse<SpotifyPlaylistItem> = { body: { items: [] } };
    let recentTracks: SpotifyPagedResponse<SpotifyRecentlyPlayedItem> = { body: { items: [] } };

    try {
      playlists = await spotifyApi.getUserPlaylists({ limit: 30 }) as SpotifyPagedResponse<SpotifyPlaylistItem>;
    } catch (e: unknown) {
      console.warn("Could not fetch user playlists, defaulting to empty. Error:", e instanceof Error ? e.message : String(e));
    }
    
    try {
      recentTracks = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 }) as SpotifyPagedResponse<SpotifyRecentlyPlayedItem>;
    } catch (e: unknown) {
      console.warn("Could not fetch recent tracks, defaulting to empty. Error:", e instanceof Error ? e.message : String(e));
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
    
    let statusCode = 500;
    if (err.message.includes("Status 401") || err.message.includes("token expired")) {
      statusCode = 401;
    } else if (err.message.includes("Status 403")) {
      statusCode = 403;
    } else if (err.message.includes("Status 429")) {
      statusCode = 429;
    }

    return NextResponse.json({ error: 'Failed to fetch comprehensive user data', details: err.message }, { status: statusCode });
  }
} 