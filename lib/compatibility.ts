import SpotifyWebApi from 'spotify-web-api-node';

// Define interfaces for the compatibility calculations
interface AudioFeatures {
  danceability: number;
  energy: number;
  tempo: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
}

interface CompatibilityMetrics {
  artistOverlap: number;
  genreOverlap: number;
  trackOverlap: number;
  audioFeaturesScore: number;
}

interface SharedArtists {
  exact: Array<{
    name: string;
    id: string;
    image?: string;
  }>;
  similar: Array<{
    user1Artist: { name: string; genres: string[] };
    user2Artist: { name: string; genres: string[] };
    sharedGenres: string[];
  }>;
}

interface CompatibilityResult {
  score: number;
  metrics: CompatibilityMetrics;
  sharedArtists: SharedArtists;
  playlistId?: string;
  messages: {
    overall: string;
    artistMessage: string;
    genreMessage: string;
    playlistMessage: string;
  };
}

/**
 * Calculate music compatibility between two Spotify users
 */
export async function calculateCompatibility(
  spotify1: SpotifyWebApi,
  spotify2: SpotifyWebApi
): Promise<CompatibilityResult> {
  try {
    // Get top items for both users
    let user1Artists, user2Artists, user1Tracks, user2Tracks;

    try {
      [user1Artists, user2Artists] = await Promise.all([
        spotify1.getMyTopArtists({ limit: 50, time_range: 'medium_term' }),
        spotify2.getMyTopArtists({ limit: 50, time_range: 'medium_term' })
      ]);
    } catch (error) {
      throw new Error('Failed to fetch top artists. This could be due to expired tokens or API limits.');
    }

    try {
      [user1Tracks, user2Tracks] = await Promise.all([
        spotify1.getMyTopTracks({ limit: 50, time_range: 'medium_term' }),
        spotify2.getMyTopTracks({ limit: 50, time_range: 'medium_term' })
      ]);
    } catch (error) {
      throw new Error('Failed to fetch top tracks. This could be due to expired tokens or API limits.');
    }

    // Calculate artist overlap
    const artistOverlap = calculateArtistOverlap(
      user1Artists.body.items,
      user2Artists.body.items
    );

    // Calculate genre overlap
    const genreOverlap = calculateGenreOverlap(
      user1Artists.body.items,
      user2Artists.body.items
    );

    // Calculate track overlap
    const trackOverlap = calculateTrackOverlap(
      user1Tracks.body.items,
      user2Tracks.body.items
    );

    // Find shared artists
    const sharedArtists: SharedArtists = {
      exact: [],
      similar: []
    };

    // Find exact artist matches
    const user1ArtistIds = new Set(user1Artists.body.items.map(a => a.id));
    user2Artists.body.items.forEach(artist => {
      if (user1ArtistIds.has(artist.id)) {
        sharedArtists.exact.push({
          name: artist.name,
          id: artist.id,
          image: artist.images?.[0]?.url
        });
      }
    });

    // Find similar artists (shared genres)
    user1Artists.body.items.forEach(artist1 => {
      user2Artists.body.items.forEach(artist2 => {
        if (artist1.id !== artist2.id) {
          const sharedGenres = artist1.genres.filter(g => artist2.genres.includes(g));
          if (sharedGenres.length > 0) {
            sharedArtists.similar.push({
              user1Artist: { name: artist1.name, genres: artist1.genres },
              user2Artist: { name: artist2.name, genres: artist2.genres },
              sharedGenres
            });
          }
        }
      });
    });

    let audioFeaturesScore = 0;
    try {
      audioFeaturesScore = await calculateAudioFeaturesSimilarity(
        spotify1,
        spotify2,
        user1Tracks.body.items.map(track => track.id),
        user2Tracks.body.items.map(track => track.id)
      );
    } catch (error) {
      console.warn('Failed to calculate audio features similarity:', error);
    }

    // Calculate final score
    const weights = {
      artists: 0.3,
      genres: 0.3,
      tracks: 0.2,
      audioFeatures: 0.2
    };

    if (audioFeaturesScore === 0) {
      weights.artists = 0.35;
      weights.genres = 0.35;
      weights.tracks = 0.3;
      weights.audioFeatures = 0;
    }

    const finalScore = Math.round(
      (artistOverlap * weights.artists +
      genreOverlap * weights.genres +
      trackOverlap * weights.tracks +
      audioFeaturesScore * weights.audioFeatures) * 100
    );

    // Generate fun messages
    const messages = generateCompatibilityMessages(finalScore, sharedArtists);

    // Create compatibility playlist
    const playlistId = await createCompatibilityPlaylist(
      spotify1,
      spotify2,
      sharedArtists,
      user1Tracks.body.items,
      user2Tracks.body.items
    );

    return {
      score: finalScore,
      metrics: {
        artistOverlap,
        genreOverlap,
        trackOverlap,
        audioFeaturesScore
      },
      sharedArtists,
      playlistId,
      messages
    };
  } catch (error) {
    console.error('Error calculating compatibility:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to calculate compatibility');
  }
}

/**
 * Calculate the overlap between two users' top artists
 */
function calculateArtistOverlap(
  artists1: SpotifyApi.ArtistObjectFull[], 
  artists2: SpotifyApi.ArtistObjectFull[]
): number {
  const set1 = new Set(artists1.map(artist => artist.id));
  const set2 = new Set(artists2.map(artist => artist.id));
  
  // Calculate Jaccard similarity (intersection size / union size)
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate the overlap between two users' artists' genres
 */
function calculateGenreOverlap(
  artists1: SpotifyApi.ArtistObjectFull[], 
  artists2: SpotifyApi.ArtistObjectFull[]
): number {
  // Extract all genres from both users' artists
  const genres1 = new Set(artists1.flatMap(artist => artist.genres));
  const genres2 = new Set(artists2.flatMap(artist => artist.genres));
  
  // Calculate Jaccard similarity for genres
  const intersection = new Set([...genres1].filter(x => genres2.has(x)));
  const union = new Set([...genres1, ...genres2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate the overlap between two users' top tracks
 */
function calculateTrackOverlap(
  tracks1: SpotifyApi.TrackObjectFull[], 
  tracks2: SpotifyApi.TrackObjectFull[]
): number {
  const set1 = new Set(tracks1.map(track => track.id));
  const set2 = new Set(tracks2.map(track => track.id));
  
  // Calculate Jaccard similarity for tracks
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate average audio features for a list of tracks
 */
function calculateAverageFeatures(features: SpotifyApi.AudioFeaturesObject[]): AudioFeatures {
  const sum = features.reduce(
    (acc, curr) => {
      return {
        danceability: acc.danceability + curr.danceability,
        energy: acc.energy + curr.energy,
        tempo: acc.tempo + curr.tempo,
        valence: acc.valence + curr.valence,
        acousticness: acc.acousticness + curr.acousticness,
        instrumentalness: acc.instrumentalness + curr.instrumentalness
      };
    },
    {
      danceability: 0,
      energy: 0,
      tempo: 0,
      valence: 0,
      acousticness: 0,
      instrumentalness: 0
    }
  );

  const count = features.length;
  return {
    danceability: sum.danceability / count,
    energy: sum.energy / count,
    tempo: sum.tempo / count,
    valence: sum.valence / count,
    acousticness: sum.acousticness / count,
    instrumentalness: sum.instrumentalness / count
  };
}

/**
 * Calculate similarity between two sets of audio features
 */
async function calculateAudioFeaturesSimilarity(
  spotify1: SpotifyWebApi,
  spotify2: SpotifyWebApi,
  trackIds1: string[],
  trackIds2: string[]
): Promise<number> {
  // Spotify API can only process 100 tracks at a time
  const features1Response = await spotify1.getAudioFeaturesForTracks(trackIds1.slice(0, 100));
  const features2Response = await spotify2.getAudioFeaturesForTracks(trackIds2.slice(0, 100));
  
  const features1 = features1Response.body.audio_features.filter(Boolean);
  const features2 = features2Response.body.audio_features.filter(Boolean);
  
  // Calculate average audio features for each user
  const avg1 = calculateAverageFeatures(features1);
  const avg2 = calculateAverageFeatures(features2);
  
  // Calculate similarity using normalized Euclidean distance
  return calculateFeatureSimilarity(avg1, avg2);
}

/**
 * Calculate similarity between two audio feature sets
 * Returns a value between 0 (completely different) and 1 (identical)
 */
function calculateFeatureSimilarity(features1: AudioFeatures, features2: AudioFeatures): number {
  // Normalize tempo to 0-1 range (most songs are between 60-180 BPM)
  const normalizedTempo1 = Math.min(features1.tempo, 180) / 180;
  const normalizedTempo2 = Math.min(features2.tempo, 180) / 180;
  
  // Calculate squared differences for each feature
  const danceabilityDiff = Math.pow(features1.danceability - features2.danceability, 2);
  const energyDiff = Math.pow(features1.energy - features2.energy, 2);
  const tempoDiff = Math.pow(normalizedTempo1 - normalizedTempo2, 2);
  const valenceDiff = Math.pow(features1.valence - features2.valence, 2);
  const acousticnessDiff = Math.pow(features1.acousticness - features2.acousticness, 2);
  const instrumentalnessDiff = Math.pow(features1.instrumentalness - features2.instrumentalness, 2);
  
  // Sum of squared differences
  const sumSquaredDiff = danceabilityDiff + energyDiff + tempoDiff + valenceDiff + 
                         acousticnessDiff + instrumentalnessDiff;
  
  // Normalized Euclidean distance (0 to 1, where 1 is most similar)
  const distance = Math.sqrt(sumSquaredDiff / 6);
  return 1 - distance;
}

/**
 * Generate a fun message based on compatibility score
 */
function generateCompatibilityMessages(score: number, sharedArtists: SharedArtists): { 
  overall: string; 
  artistMessage: string;
  genreMessage: string;
  playlistMessage: string;
} {
  const messages = {
    high: [
      "🎵 You two are basically musical soulmates! The universe is singing your harmony!",
      "🌟 Your music taste is so in sync, you might be long-lost playlist twins!",
      "🎸 Mind-blowing musical chemistry alert! You should start a band together!"
    ],
    medium: [
      "🎧 Not bad at all! Your musical wavelengths are definitely vibing!",
      "🎪 You've got a fun musical friendship brewing here!",
      "🌈 Different enough to be interesting, similar enough to share aux cord duties!"
    ],
    low: [
      "🎭 Opposites attract! Your diverse tastes could make for some interesting music exchanges!",
      "🎪 Well, at least you'll always have something new to show each other!",
      "🌱 Think of this as an opportunity to expand your musical horizons!"
    ]
  };

  const category = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const randomIndex = Math.floor(Math.random() * messages[category].length);

  const artistCount = sharedArtists.exact.length;
  const artistMessage = artistCount > 0
    ? `You both groove to ${artistCount} of the same artists! ${sharedArtists.exact.slice(0, 3).map(a => a.name).join(', ')} would be proud! 🎸`
    : "Time to introduce each other to your favorite artists! 🎤";

  const genreMessage = sharedArtists.similar.length > 0
    ? "You've got some genre chemistry going on! 🎵"
    : "Your genre tastes are like parallel universes - fascinating! 🌌";

  const playlistMessage = score >= 60
    ? "I've crafted a playlist that celebrates your shared music vibes! 🎶"
    : "I've made you a playlist to bridge your musical worlds! 🌉";

  return {
    overall: messages[category][randomIndex],
    artistMessage,
    genreMessage,
    playlistMessage
  };
}

/**
 * Create a compatibility playlist for both users
 */
async function createCompatibilityPlaylist(
  spotify1: SpotifyWebApi,
  spotify2: SpotifyWebApi,
  sharedArtists: SharedArtists,
  user1Tracks: SpotifyApi.TrackObjectFull[],
  user2Tracks: SpotifyApi.TrackObjectFull[]
): Promise<string | undefined> {
  try {
    // Get current user's info
    const me = await spotify1.getMe();
    
    // Create a new playlist
    const playlistResponse = await spotify1.createPlaylist(me.body.id, {
      description: '🎵 Your Musical Connection Playlist 🎭\nA specially curated playlist celebrating your musical compatibility! Mix of shared favorites and recommended discoveries.',
      public: false,
      collaborative: false
    });

    if (!playlistResponse || !playlistResponse.body) {
      throw new Error('Failed to create playlist');
    }

    const playlist = playlistResponse.body;
    
    // Update playlist name separately since it's not supported in creation options
    await spotify1.changePlaylistDetails(playlist.id, {
      name: '🎵 Your Musical Connection Playlist 🎭'
    });
    
    // Collect tracks to add
    const tracksToAdd = new Set<string>();
    
    // Add some tracks from shared artists
    for (const artist of sharedArtists.exact) {
      const topTracks = await spotify1.getArtistTopTracks(artist.id, 'US');
      topTracks.body.tracks.slice(0, 2).forEach(track => tracksToAdd.add(track.uri));
    }

    // Add some tracks from each user's top tracks
    user1Tracks.slice(0, 5).forEach(track => tracksToAdd.add(track.uri));
    user2Tracks.slice(0, 5).forEach(track => tracksToAdd.add(track.uri));

    // Add tracks to playlist
    if (tracksToAdd.size > 0) {
      await spotify1.addTracksToPlaylist(playlist.id, Array.from(tracksToAdd));
    }

    return playlist.id;
  } catch (error) {
    console.error('Error creating compatibility playlist:', error);
    return undefined;
  }
} 