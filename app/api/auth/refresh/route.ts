import { NextRequest, NextResponse } from 'next/server';
import spotifyApi from '@/lib/spotify';

export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value;
  
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  try {
    spotifyApi.setRefreshToken(refreshToken);
    const data = await spotifyApi.refreshAccessToken();
    const { access_token, expires_in } = data.body;

    const response = NextResponse.json({ success: true });
    
    response.cookies.set({
      name: 'spotify_access_token',
      value: access_token,
      maxAge: expires_in,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
    });

    return response;
  } catch (error) {
    console.error('Error refreshing token:', error);
    const response = NextResponse.json(
      { error: 'Failed to refresh token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 401 }
    );

    response.cookies.set({
      name: 'spotify_access_token',
      value: '',
      maxAge: 0,
      path: '/',
    });
    
    response.cookies.set({
      name: 'spotify_refresh_token',
      value: '',
      maxAge: 0,
      path: '/',
    });

    return response;
  }
} 