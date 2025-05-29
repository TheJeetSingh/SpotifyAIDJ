import { NextRequest, NextResponse } from 'next/server';
import SpotifyWebApi from 'spotify-web-api-node';
import { calculateCompatibility } from '@/lib/compatibility';
import spotifyApi from '@/lib/spotify';

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('spotify_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated', details: 'Access token cookie missing.' }, 
        { status: 401 }
      );
    }

    const { friendCode } = await req.json();
    
    if (!friendCode) {
      return NextResponse.json(
        { error: 'Missing friend code', details: 'Friend code is required.' }, 
        { status: 400 }
      );
    }

    const currentUserApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    currentUserApi.setAccessToken(accessToken);

    try {
      await currentUserApi.getMe();
    } catch {
      return NextResponse.json(
        { error: 'Invalid access token', details: 'Your session has expired. Please log in again.' },
        { status: 401 }
      );
    }

    let decodedFriendCode: string;
    try {
      decodedFriendCode = Buffer.from(friendCode, 'base64').toString('utf-8');
    } catch {
      return NextResponse.json(
        { error: 'Invalid friend code format', details: 'The provided friend code is not properly encoded.' },
        { status: 400 }
      );
    }

    const [friendUserId, friendAccessToken] = decodedFriendCode.split(':');

    if (!friendUserId || !friendAccessToken) {
      return NextResponse.json(
        { error: 'Invalid friend code', details: 'The provided friend code is invalid.' },
        { status: 400 }
      );
    }

    const friendApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    friendApi.setAccessToken(friendAccessToken);

    try {
      await friendApi.getMe();
    } catch {
      return NextResponse.json(
        { error: 'Invalid friend code', details: 'Your friend\'s session has expired. Ask them to generate a new friend code.' },
        { status: 400 }
      );
    }

    try {
      const result = await calculateCompatibility(currentUserApi, friendApi);

      const [currentUser, friendUser] = await Promise.all([
        currentUserApi.getMe(),
        friendApi.getMe()
      ]);

      return NextResponse.json({
        score: result.score,
        metrics: result.metrics,
        sharedArtists: result.sharedArtists,
        playlistId: result.playlistId,
        messages: result.messages,
        currentUser: {
          id: currentUser.body.id,
          name: currentUser.body.display_name,
          image: currentUser.body.images?.[0]?.url
        },
        friendUser: {
          id: friendUser.body.id,
          name: friendUser.body.display_name,
          image: friendUser.body.images?.[0]?.url
        }
      });
    } catch (err) {
      console.error('Error calculating compatibility:', err);
      return NextResponse.json(
        { error: 'Compatibility calculation failed', details: err instanceof Error ? err.message : 'Unknown error occurred' },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('Error in compatibility endpoint:', err);
    return NextResponse.json(
      { error: 'Server error', details: err instanceof Error ? err.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('spotify_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated', details: 'Access token cookie missing.' }, 
        { status: 401 }
      );
    }

    spotifyApi.setAccessToken(accessToken);
    
    try {
      const user = await spotifyApi.getMe();
      const userId = user.body.id;
      
      const friendCode = Buffer.from(`${userId}:${accessToken}`).toString('base64');
      
      return NextResponse.json({ friendCode });
    } catch {
      return NextResponse.json(
        { error: 'Invalid access token', details: 'Your session has expired. Please log in again.' },
        { status: 401 }
      );
    }
  } catch (err) {
    console.error('Error generating friend code:', err);
    return NextResponse.json(
      { error: 'Failed to generate friend code', details: err instanceof Error ? err.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 