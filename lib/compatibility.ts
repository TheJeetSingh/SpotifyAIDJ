import SpotifyWebApi from 'spotify-web-api-node';

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

export async function calculateCompatibility(
  spotify1: SpotifyWebApi,
  spotify2: SpotifyWebApi
): Promise<CompatibilityResult> {
  try {
    let user1Artists, user2Artists, user1Tracks, user2Tracks;

    try {
      [user1Artists, user2Artists] = await Promise.all([
        spotify1.getMyTopArtists({ limit: 50, time_range: 'medium_term' }),
        spotify2.getMyTopArtists({ limit: 50, time_range: 'medium_term' })
      ]);
    } catch {
      throw new Error('Failed to fetch top artists. This could be due to expired tokens or API limits.');
    }

    try {
      [user1Tracks, user2Tracks] = await Promise.all([
        spotify1.getMyTopTracks({ limit: 50, time_range: 'medium_term' }),
        spotify2.getMyTopTracks({ limit: 50, time_range: 'medium_term' })
      ]);
    } catch {
      throw new Error('Failed to fetch top tracks. This could be due to expired tokens or API limits.');
    }

    const artistOverlap = calculateArtistOverlap(
      user1Artists.body.items,
      user2Artists.body.items
    );

    const genreOverlap = calculateGenreOverlap(
      user1Artists.body.items,
      user2Artists.body.items
    );

    const trackOverlap = calculateTrackOverlap(
      user1Tracks.body.items,
      user2Tracks.body.items
    );

    const sharedArtists: SharedArtists = {
      exact: [],
      similar: []
    };

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

    const messages = generateCompatibilityMessages(finalScore, sharedArtists);

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

function calculateArtistOverlap(
  artists1: SpotifyApi.ArtistObjectFull[], 
  artists2: SpotifyApi.ArtistObjectFull[]
): number {
  const set1 = new Set(artists1.map(artist => artist.id));
  const set2 = new Set(artists2.map(artist => artist.id));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function calculateGenreOverlap(
  artists1: SpotifyApi.ArtistObjectFull[], 
  artists2: SpotifyApi.ArtistObjectFull[]
): number {
  const genres1 = new Set(artists1.flatMap(artist => artist.genres));
  const genres2 = new Set(artists2.flatMap(artist => artist.genres));
  
  const intersection = new Set([...genres1].filter(x => genres2.has(x)));
  const union = new Set([...genres1, ...genres2]);
  
  return intersection.size / union.size;
}

function calculateTrackOverlap(
  tracks1: SpotifyApi.TrackObjectFull[], 
  tracks2: SpotifyApi.TrackObjectFull[]
): number {
  const set1 = new Set(tracks1.map(track => track.id));
  const set2 = new Set(tracks2.map(track => track.id));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function calculateAverageFeatures(features: SpotifyApi.AudioFeaturesObject[]): AudioFeatures {
  const sum = features.reduce(
    (acc, curr) => {
      return {
        danceability: acc.danceability + curr.danceability,
        energy: acc.energy + curr.energy,
        tempo: acc.tempo + curr.tempo,
        valence: acc.valence + curr.valence,
        acousticness: acc.acousticness + curr.acousticness,
        instrumentalness: acc.instrumentalness + curr.instrumentalness,
      };
    },
    {
      danceability: 0,
      energy: 0,
      tempo: 0,
      valence: 0,
      acousticness: 0,
      instrumentalness: 0,
    }
  );

  const count = features.length || 1;
  return {
    danceability: sum.danceability / count,
    energy: sum.energy / count,
    tempo: sum.tempo / count,
    valence: sum.valence / count,
    acousticness: sum.acousticness / count,
    instrumentalness: sum.instrumentalness / count,
  };
}

async function calculateAudioFeaturesSimilarity(
  spotify1: SpotifyWebApi,
  spotify2: SpotifyWebApi,
  trackIds1: string[],
  trackIds2: string[]
): Promise<number> {
  try {
    if (!trackIds1.length || !trackIds2.length) return 0;

    const [features1Res, features2Res] = await Promise.all([
      spotify1.getAudioFeaturesForTracks(trackIds1.slice(0, 100)), 
      spotify2.getAudioFeaturesForTracks(trackIds2.slice(0, 100)),
    ]);

    const features1 = features1Res.body.audio_features.filter(f => f);
    const features2 = features2Res.body.audio_features.filter(f => f);

    if (!features1.length || !features2.length) return 0;

    const avgFeatures1 = calculateAverageFeatures(features1);
    const avgFeatures2 = calculateAverageFeatures(features2);

    return calculateFeatureSimilarity(avgFeatures1, avgFeatures2);
  } catch (error) {
    console.error('Error calculating audio features similarity:', error);
    return 0; 
  }
}

function calculateFeatureSimilarity(features1: AudioFeatures, features2: AudioFeatures): number {
  const diffs = [
    Math.abs(features1.danceability - features2.danceability),
    Math.abs(features1.energy - features2.energy),
    Math.abs(features1.valence - features2.valence),
    Math.abs(features1.acousticness - features2.acousticness),
    Math.abs(features1.instrumentalness - features2.instrumentalness),
  ];

  const normalizedTempoDiff = Math.abs(features1.tempo - features2.tempo) / 200; 
  diffs.push(normalizedTempoDiff);

  const similarity = 1 - (diffs.reduce((a, b) => a + b, 0) / diffs.length);
  return Math.max(0, similarity);
}

function generateCompatibilityMessages(score: number, sharedArtists: SharedArtists): { 
  overall: string; 
  artistMessage: string;
  genreMessage: string;
  playlistMessage: string;
} {
  let overall = '';
  let artistMessage = '';
  let genreMessage = '';
  let playlistMessage = '';

  if (score >= 80) {
    overall = "Wow, you two are practically musical soulmates! Your tastes align beautifully.";
  } else if (score >= 60) {
    overall = "You've got great compatibility! There's a lot of common ground here.";
  } else if (score >= 40) {
    overall = "Decent compatibility. You share some common artists and genres, but there's room to explore!";
  } else {
    overall = "Your tastes are quite different, but hey, opposites attract, right? Or maybe not in music...";
  }

  if (sharedArtists.exact.length > 0) {
    const topShared = sharedArtists.exact.slice(0, 3).map(a => a.name).join(', ');
    artistMessage = `You both love ${topShared}! That's a great starting point.`;
    if (sharedArtists.exact.length > 3) {
      artistMessage += ` And ${sharedArtists.exact.length - 3} more!`;
    }
  } else if (sharedArtists.similar.length > 0) {
    const firstSimilar = sharedArtists.similar[0];
    artistMessage = `While you don't share exact top artists, you both like artists in the ${firstSimilar.sharedGenres[0]} genre, like ${firstSimilar.user1Artist.name} and ${firstSimilar.user2Artist.name}.`;
  } else {
    artistMessage = "You don't have many overlapping top artists. Time to introduce each other to some new tunes!";
  }
  
  if (score >= 70) {
    genreMessage = "Your genre preferences are a strong match!";
  } else if (score >= 50) {
    genreMessage = "You've got some solid genre overlap.";
  } else {
    genreMessage = "Your preferred genres might be a bit different, offering a chance for musical discovery.";
  }

  playlistMessage = "We've created a special 'Compatibility Mix' for you. Check it out on Spotify!";

  return { overall, artistMessage, genreMessage, playlistMessage };
}

async function createCompatibilityPlaylist(
  spotify1: SpotifyWebApi,
  spotify2: SpotifyWebApi,
  sharedArtists: SharedArtists,
  user1Tracks: SpotifyApi.TrackObjectFull[],
  user2Tracks: SpotifyApi.TrackObjectFull[]
): Promise<string | undefined> {
  try {
    const user1 = await spotify1.getMe();
    const user2 = await spotify2.getMe();

    const playlistName = `Music Match: ${user1.body.display_name} & ${user2.body.display_name}`;
    const playlistDescription = `A playlist celebrating the musical compatibility between ${user1.body.display_name} and ${user2.body.display_name}. Score: ${await calculateCompatibility(spotify1, spotify2).then(r => r.score)}%`;

    const { body: playlist } = await spotify1.createPlaylist(playlistName, {
      description: playlistDescription,
      public: false, 
    });

    let trackUris: string[] = [];

    const sharedTrackIds = new Set(
      user1Tracks.filter(t1 => user2Tracks.some(t2 => t2.id === t1.id)).map(t => t.id)
    );
    trackUris.push(...Array.from(sharedTrackIds).map(id => `spotify:track:${id}`).slice(0, 20));

    if (trackUris.length < 30 && sharedArtists.exact.length > 0) {
      const artistTrackPromises = sharedArtists.exact.slice(0, 5).map(async (artist) => {
        const tracks1 = await spotify1.getArtistTopTracks(artist.id, user1.body.country || 'US');
        const tracks2 = await spotify2.getArtistTopTracks(artist.id, user2.body.country || 'US');
        return [...tracks1.body.tracks, ...tracks2.body.tracks]
          .map(t => t.uri)
          .filter(uri => !trackUris.includes(uri));
      });
      const artistTracks = (await Promise.all(artistTrackPromises)).flat();
      trackUris.push(...[...new Set(artistTracks)].slice(0, 30 - trackUris.length));
    }

    if (trackUris.length < 30) {
      const combinedTopTracks = [...user1Tracks, ...user2Tracks]
        .sort(() => 0.5 - Math.random()) 
        .map(t => t.uri)
        .filter(uri => !trackUris.includes(uri));
      trackUris.push(...[...new Set(combinedTopTracks)].slice(0, 30 - trackUris.length));
    }
    
    trackUris = [...new Set(trackUris)].slice(0,50);

    if (trackUris.length > 0) {
      await spotify1.addTracksToPlaylist(playlist.id, trackUris);
    }

    return playlist.id;
  } catch (error) {
    console.error('Error creating compatibility playlist:', error);
    return undefined;
  }
}