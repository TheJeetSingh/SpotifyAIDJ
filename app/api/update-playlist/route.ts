import { NextRequest, NextResponse } from 'next/server';
import spotifyApi from '@/lib/spotify';

interface Track {
  name: string;
  artists: string[];
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { playlistId, tracks } = body;
    
    if (!playlistId || !tracks || !Array.isArray(tracks)) {
      return NextResponse.json({ error: 'Invalid playlist data' }, { status: 400 });
    }

    // Set the access token
    spotifyApi.setAccessToken(accessToken);
    
    try {
      // Get the current playlist to verify ownership and access (optional)
      // const playlistResponse = await spotifyApi.getPlaylist(playlistId);
      // const _playlist = playlistResponse.body; // Prefix with _ if planning to use later
      await spotifyApi.getPlaylist(playlistId); // Call to ensure playlist exists and is accessible
      
      // First, clear the existing tracks from the playlist
      await spotifyApi.replaceTracksInPlaylist(playlistId, []);
      
      // Search for each track and add it to the playlist
      const searchPromises = tracks.map(async (track: Track) => {
        // Handle different track formats gracefully
        let searchQuery = '';
        if (typeof track === 'string') {
          searchQuery = track;
        } else {
          const artistsString = Array.isArray(track.artists) 
            ? track.artists[0] 
            : typeof track.artists === 'string' 
              ? track.artists 
              : '';
          searchQuery = `${track.name} ${artistsString}`;
        }
        
        try {
          const searchResult = await spotifyApi.searchTracks(searchQuery, { limit: 1 });
          if (searchResult.body.tracks?.items?.[0]?.uri) {
            return searchResult.body.tracks.items[0].uri;
          }
          return null;
        } catch (error) {
          console.error(`Error searching for track: ${searchQuery}`, error);
          return null;
        }
      });
      
      const trackUris = (await Promise.all(searchPromises)).filter(Boolean);
      
      // Add the tracks to the playlist in the new order
      if (trackUris.length > 0) {
        await spotifyApi.addTracksToPlaylist(
          playlistId,
          trackUris as string[]
        );
      }
      
      // Get the updated playlist
      const updatedPlaylistResponse = await spotifyApi.getPlaylist(playlistId);
      
      return NextResponse.json({
        success: true,
        playlist: updatedPlaylistResponse.body,
        trackCount: trackUris.length
      });
    } catch (spotifyError) {
      console.error('Spotify API error:', spotifyError);
      return NextResponse.json({ 
        error: 'Failed to update playlist on Spotify',
        details: (spotifyError as Error).message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
} 