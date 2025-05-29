import { NextRequest, NextResponse } from 'next/server';
import { spotifyApi } from '../../../lib/spotify'; // Adjust path as needed

// Define a more specific type for Spotify API errors if known
interface SpotifyApiError extends Error {
  body?: {
    error?: {
      message?: string;
    };
  };
  statusCode?: number;
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value;

  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { playlistId, coverImageBase64 } = body;

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }
    if (!coverImageBase64) {
      return NextResponse.json({ error: 'Cover image data is required' }, { status: 400 });
    }

    spotifyApi.setAccessToken(accessToken);

    // The Spotify API expects the Base64 data without the data URI prefix.
    const base64Data = coverImageBase64.startsWith('data:image/jpeg;base64,')
      ? coverImageBase64.substring('data:image/jpeg;base64,'.length)
      : coverImageBase64;

    await spotifyApi.uploadCustomPlaylistCoverImage(playlistId, base64Data);

    return NextResponse.json({ success: true, message: 'Playlist cover updated successfully' });

  } catch (error) {
    console.error('Error updating playlist cover:', error);
    // Type the error more specifically
    let errorMessage = 'Failed to update playlist cover';
    let errorStatus = 500;

    if (error instanceof Error) {
        errorMessage = error.message;
        // Check if it's a SpotifyApiError (or has a similar structure)
        const potentialSpotifyError = error as SpotifyApiError;
        if (potentialSpotifyError.body?.error?.message) {
            errorMessage = potentialSpotifyError.body.error.message;
        }
        if (potentialSpotifyError.statusCode) {
            errorStatus = potentialSpotifyError.statusCode;
        }
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
} 