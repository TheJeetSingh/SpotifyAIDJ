import { NextRequest, NextResponse } from 'next/server';
import SpotifyWebApi from 'spotify-web-api-node';
import { calculateCompatibility } from '@/lib/compatibility';
import spotifyApi from '@/lib/spotify';

export async function POST(req: NextRequest) {
  try {
    // Get the current user's access token from cookies
    const accessToken = req.cookies.get('spotify_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated', details: 'Access token cookie missing.' }, 
        { status: 401 }
      );
    }

    // Get the friend code from the request body
    const { friendCode } = await req.json();
    
    if (!friendCode) {
      return NextResponse.json(
        { error: 'Missing friend code', details: 'Friend code is required.' }, 
        { status: 400 }
      );
    }

    // Set up API for current user
    const currentUserApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    currentUserApi.setAccessToken(accessToken);

    // Verify current user's token is valid
    try {
      await currentUserApi.getMe();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid access token', details: 'Your session has expired. Please log in again.' },
        { status: 401 }
      );
    }

    // Decode the friend code to get their data
    let decodedFriendCode: string;
    try {
      decodedFriendCode = Buffer.from(friendCode, 'base64').toString('utf-8');
    } catch (error) {
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

    // Set up API for friend
    const friendApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI
    });
    friendApi.setAccessToken(friendAccessToken);

    // Verify friend's token is valid
    try {
      await friendApi.getMe();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid friend code', details: 'Your friend\'s session has expired. Ask them to generate a new friend code.' },
        { status: 400 }
      );
    }

    try {
      // Calculate compatibility
      const result = await calculateCompatibility(currentUserApi, friendApi);

      // Get basic user info for both users for the response
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
    } catch (error) {
      console.error('Error calculating compatibility:', error);
      return NextResponse.json(
        { error: 'Compatibility calculation failed', details: error instanceof Error ? error.message : 'Unknown error occurred' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in compatibility endpoint:', error);
    return NextResponse.json(
      { error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// Generate a shareable friend code for the current user
export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('spotify_access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated', details: 'Access token cookie missing.' }, 
        { status: 401 }
      );
    }

    // Set up Spotify API with the user's access token
    spotifyApi.setAccessToken(accessToken);
    
    // Verify the token is still valid
    try {
      const user = await spotifyApi.getMe();
      const userId = user.body.id;
      
      // Create a friend code: userId:accessToken (base64 encoded)
      const friendCode = Buffer.from(`${userId}:${accessToken}`).toString('base64');
      
      return NextResponse.json({ friendCode });
    } catch (error) {
      // If token verification fails, return 401
      return NextResponse.json(
        { error: 'Invalid access token', details: 'Your session has expired. Please log in again.' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error generating friend code:', error);
    return NextResponse.json(
      { error: 'Failed to generate friend code', details: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 