import SpotifyWebApi from 'spotify-web-api-node';

// Get the credentials from environment variables
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

if (!clientId) throw new Error('SPOTIFY_CLIENT_ID must be defined');
if (!clientSecret) throw new Error('SPOTIFY_CLIENT_SECRET must be defined');

const scopes = [
  'user-read-email',
  'user-read-private',
  'user-library-read',
  'user-top-read',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-recently-played',
  'ugc-image-upload',
].join(',');

const params = {
  scope: scopes,
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
};

const queryParamString = new URLSearchParams(params).toString();

export const LOGIN_URL = `https://accounts.spotify.com/authorize?${queryParamString}`;

export const spotifyApi = new SpotifyWebApi({
  clientId,
  clientSecret,
  redirectUri,
});

export default spotifyApi; 