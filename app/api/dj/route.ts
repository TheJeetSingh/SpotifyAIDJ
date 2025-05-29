import { NextRequest, NextResponse } from 'next/server';
import spotifyApi from '@/lib/spotify';
import { generatePlaylistRecommendation } from '@/lib/openai';

interface SpotifyArtist {
  name: string;
  id?: string; // id is sometimes optional
}
interface SpotifyAlbumImage {
  url: string;
}
interface SpotifyAlbum {
  images: SpotifyAlbumImage[];
  name?: string; // Album name is sometimes optional
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  uri: string;
  album?: SpotifyAlbum; // Album is optional and has a refined type
}

interface SpotifyResponse {
  body: SpotifyTrack; // Assuming getTrack returns a single track
}

interface SpotifyArtistResponse {
  body: { name: string; id: string }; // Assuming getArtist returns this structure
}

// Type for items from a playlist
interface SpotifyPlaylistItem {
  track: SpotifyTrack | null; // track can be null
}

// Type for the response of getPlaylist
interface SpotifyPlaylistResponse {
  body: {
    tracks: {
      items: SpotifyPlaylistItem[];
    };
    id: string; // Playlist ID
    name: string; // Playlist name
    // other playlist properties if needed
  };
}

//Type for searchTracks response
interface SpotifySearchTracksResponse {
 body: {
    tracks?: {
        items?: SpotifyTrack[];
    };
 };
}

export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get('spotify_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { songIds, mood, genre, songCount, selectedArtistIds, coverImageBase64 } = body;
    
    if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
      return NextResponse.json({ error: 'Invalid song selection' }, { status: 400 });
    }

    spotifyApi.setAccessToken(accessToken);
    
    const trackPromises = songIds.map((id: string) => spotifyApi.getTrack(id));
    const trackResponses = await Promise.all(trackPromises) as SpotifyResponse[];
    const initialTracks = trackResponses.map(response => response.body);
    
    const songStrings = initialTracks.map((track: SpotifyTrack) => 
      `${track.name} - ${track.artists.map((a: SpotifyArtist) => a.name).join(', ')}`
    );
    
    let favoriteArtists: string[] = [];
    if (selectedArtistIds && selectedArtistIds.length > 0) {
      const artistPromises = selectedArtistIds.map((id: string) => spotifyApi.getArtist(id));
      const artistResponses = await Promise.all(artistPromises) as SpotifyArtistResponse[];
      favoriteArtists = artistResponses.map(response => response.body.name);
    }
    
    const recommendations = await generatePlaylistRecommendation(
      songStrings,
      mood || 'energetic',
      songCount || 10,
      genre,
      favoriteArtists
    );

    const formattedTracks = recommendations.map((recommendation: string) => {
      const parts = recommendation.split(' - ');
      const name = parts[0].trim();
      const artists = parts.length > 1 ? parts[1].split(',').map((a:string) => ({name: a.trim()})) : [];
      return { name, artists }; // This matches {name: string, artists: {name: string}[]} for UI
    });
    
    let createdPlaylist = null;
    let fullSpotifyTracks: SpotifyTrack[] = [];
    
    try {
      const playlistName = `AI DJ: ${mood || 'Mix'} ${genre ? `(${genre})` : ''}`;
      const playlistResponse = await spotifyApi.createPlaylist(playlistName, {
        description: `AI DJ generated playlist with ${songCount || 10} songs. Mood: ${mood}${genre ? `, Genre: ${genre}` : ''}`,
        public: false,
      });
      
      createdPlaylist = playlistResponse.body;
      
      if (createdPlaylist && coverImageBase64) {
        try {
          // Remove data:image/jpeg;base64, prefix if it exists
          const base64Data = coverImageBase64.startsWith('data:image/jpeg;base64,') 
            ? coverImageBase64.substring('data:image/jpeg;base64,'.length) 
            : coverImageBase64;
          await spotifyApi.uploadCustomPlaylistCoverImage(
            createdPlaylist.id,
            base64Data
          );
          console.log(`Custom cover image uploaded for playlist ${createdPlaylist.id}`);
        } catch (coverError) {
          console.error('Error uploading playlist cover image:', coverError);
          // Do not fail the whole process if cover upload fails, just log it.
        }
      }
      
      const searchPromises = recommendations.map(async (recommendation: string) => {
        const searchResult = await spotifyApi.searchTracks(recommendation, { limit: 1 }) as SpotifySearchTracksResponse;
        return searchResult.body.tracks?.items?.[0]?.uri;
      });
      
      const recommendedTrackUris = (await Promise.all(searchPromises)).filter((uri): uri is string => !!uri);
      
      if (recommendedTrackUris.length > 0 && createdPlaylist) {
        await spotifyApi.addTracksToPlaylist(
          createdPlaylist.id,
          recommendedTrackUris
        );
        
        const playlistDetailsResponse = await spotifyApi.getPlaylist(createdPlaylist.id) as SpotifyPlaylistResponse;
        fullSpotifyTracks = playlistDetailsResponse.body.tracks.items
          .map((item: SpotifyPlaylistItem) => item.track)
          .filter((track): track is SpotifyTrack => track !== null);
      }
    } catch (playlistError) {
      console.error('Error creating or populating playlist:', playlistError);
    }
    
    return NextResponse.json({
      success: true,
      playlist: createdPlaylist, // This is the created playlist object from Spotify
      recommendations, // Raw string recommendations from AI
      tracks: formattedTracks, // Simplified {name, artists} for UI display of AI recs before Spotify lookup
      spotifyTracks: fullSpotifyTracks, // Full track objects for tracks added to Spotify playlist
      explanation: `Here's your personalized ${mood} playlist with ${recommendations.length} songs.`
    });
  } catch (error) {
    console.error('Error generating DJ recommendations:', error);
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
} 