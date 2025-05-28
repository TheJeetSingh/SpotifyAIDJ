import { NextRequest, NextResponse } from 'next/server';
import spotifyApi from '@/lib/spotify';
import { generateMusicTasteRoasts } from '@/lib/openai';

// Define interfaces for Spotify API responses
interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    name: string;
    images: SpotifyImage[];
  };
}

// Generic type for Spotify API paged results
interface SpotifyPagedResponse<T> {
  body: {
    items: T[];
  };
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('spotify_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    spotifyApi.setAccessToken(accessToken);
    
    // Fetch user's top tracks, artists, and genres
    const topTracks = await spotifyApi.getMyTopTracks({ limit: 50, time_range: 'medium_term' }) as SpotifyPagedResponse<SpotifyTrack>;
    const topArtists = await spotifyApi.getMyTopArtists({ limit: 20, time_range: 'medium_term' }) as SpotifyPagedResponse<SpotifyArtist>;
    
    // Extract genres from top artists
    const allGenres = topArtists.body.items.flatMap(artist => artist.genres);
    const genreCounts: Record<string, number> = {};
    
    allGenres.forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
    
    // Sort genres by frequency
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genre]) => genre);
    
    // Extract track names and artist names
    const trackNames = topTracks.body.items.map(track => track.name);
    const artistNames = topArtists.body.items.map(artist => artist.name);
    
    // Generate AI-powered roasts based on the user's music taste
    const roasts = await generateMusicTasteRoasts(trackNames, artistNames, topGenres, 5);
    
    return NextResponse.json({
      success: true,
      roasts,
      topGenres,
      topArtistNames: artistNames.slice(0, 5),
      topTrackNames: trackNames.slice(0, 5),
      isAiGenerated: true
    });
  } catch (error) {
    console.error('Error in roast API:', error);
    const err = error as Error;
    
    // Check if this is a quota error
    const isQuotaError = err.message.includes('quota') || 
                         err.message.includes('429') || 
                         err.message.includes('Too Many Requests');
    
    // Fallback to static roasts if AI generation fails
    const fallbackRoasts = generateFallbackRoasts([], [], []);
    
    return NextResponse.json(
      { 
        error: isQuotaError ? 'AI quota exceeded, using fallbacks' : 'Failed to generate AI roasts, using fallbacks', 
        details: err.message,
        success: true,
        roasts: fallbackRoasts,
        topGenres: [],
        topArtistNames: [],
        topTrackNames: [],
        isAiGenerated: false
      }, 
      { status: 200 }
    );
  }
}

// Fallback function for static roasts if AI fails
function generateFallbackRoasts(
  trackNames: string[], 
  artistNames: string[], 
  genres: string[]
): string[] {
  // Generic roasts that can be applied to most music tastes
  const genericRoasts = [
    "Your playlist is what I'd expect to hear in an elevator... to hell.",
    "I see you've curated your music with all the precision of a blindfolded dart player.",
    "Congratulations on having the musical taste of a middle schooler trying to impress their crush.",
    "Your music library is basically a monument to algorithms that gave up on you.",
    "I'd rather listen to my neighbor's lawnmower than another minute of your playlist.",
    "If your music taste was a spice, it would be flour.",
    "Your playlist is the audio equivalent of watching paint dry.",
    "I've heard more musical diversity in a car alarm.",
    "Do you listen to this music ironically, or are you genuinely this uncool?",
    "If this playlist was a person, it would be the one who brings a guitar to a party."
  ];
  
  // Generate artist-specific roasts
  const artistRoasts = artistNames.slice(0, 3).map(artist => {
    return `You listen to ${artist}? I guess someone has to keep their career alive.`;
  });
  
  // Generate genre-specific roasts
  const genreRoasts: string[] = [];
  
  if (genres.includes('pop')) {
    genreRoasts.push("Ah, pop music... because originality was just too much effort.");
  }
  
  if (genres.includes('rock')) {
    genreRoasts.push("Your rock collection is about as edgy as safety scissors.");
  }
  
  if (genres.includes('hip hop') || genres.includes('rap')) {
    genreRoasts.push("Your hip hop choices suggest you think wearing a baseball cap backward is still rebellious.");
  }
  
  if (genres.includes('indie')) {
    genreRoasts.push("Let me guess, you only liked these indie bands 'before they were cool'... and sadly, they still aren't.");
  }
  
  if (genres.includes('electronic') || genres.includes('edm')) {
    genreRoasts.push("Your electronic music taste has all the depth of a kiddie pool.");
  }
  
  if (genres.includes('classical')) {
    genreRoasts.push("Classical music, huh? Trying to convince everyone you're sophisticated when we all know you're just napping.");
  }
  
  if (genres.includes('jazz')) {
    genreRoasts.push("Jazz fan? So you pretend to understand what's happening while secretly wondering when the actual song will start.");
  }
  
  if (genres.includes('metal')) {
    genreRoasts.push("Your metal playlist suggests you're still angry about that time someone stole your lunch money in 7th grade.");
  }
  
  if (genres.includes('country')) {
    genreRoasts.push("Country music? I didn't realize you were going through a divorce and lost your truck and dog simultaneously.");
  }
  
  if (genres.includes('r&b') || genres.includes('soul')) {
    genreRoasts.push("Your R&B collection suggests you think you're smooth, but we both know you have the romantic grace of a giraffe on roller skates.");
  }
  
  // Combine all roasts and ensure we have at least 5
  let allRoasts = [...genreRoasts, ...artistRoasts, ...genericRoasts];
  
  // Shuffle the roasts for variety
  allRoasts = allRoasts.sort(() => Math.random() - 0.5);
  
  return allRoasts.slice(0, 5);
} 