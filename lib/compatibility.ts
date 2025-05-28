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

/**
 * Calculate music compatibility between two Spotify users
 */
export async function calculateCompatibility(
  spotify1: SpotifyWebApi,
  spotify2: SpotifyWebApi
): Promise<{ score: number; metrics: CompatibilityMetrics }> {
  try {
    // Get top items for both users
    const [user1Artists, user2Artists] = await Promise.all([
      spotify1.getMyTopArtists({ limit: 50, time_range: 'medium_term' }),
      spotify2.getMyTopArtists({ limit: 50, time_range: 'medium_term' })
    ]);
    
    const [user1Tracks, user2Tracks] = await Promise.all([
      spotify1.getMyTopTracks({ limit: 50, time_range: 'medium_term' }),
      spotify2.getMyTopTracks({ limit: 50, time_range: 'medium_term' })
    ]);

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

    // Calculate audio features similarity
    const audioFeaturesScore = await calculateAudioFeaturesSimilarity(
      spotify1,
      spotify2,
      user1Tracks.body.items.map(track => track.id),
      user2Tracks.body.items.map(track => track.id)
    );

    // Weight the different factors
    const weights = {
      artists: 0.3,
      genres: 0.3,
      tracks: 0.2,
      audioFeatures: 0.2
    };

    const finalScore = (
      artistOverlap * weights.artists +
      genreOverlap * weights.genres +
      trackOverlap * weights.tracks +
      audioFeaturesScore * weights.audioFeatures
    ) * 100;

    return {
      score: Math.round(finalScore),
      metrics: {
        artistOverlap,
        genreOverlap,
        trackOverlap,
        audioFeaturesScore
      }
    };
  } catch (error) {
    console.error('Error calculating compatibility:', error);
    throw new Error('Failed to calculate compatibility');
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