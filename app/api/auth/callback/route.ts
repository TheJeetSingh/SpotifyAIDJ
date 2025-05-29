import { NextRequest, NextResponse } from 'next/server';
import spotifyApi from '@/lib/spotify';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  
  if (!code) {
    return NextResponse.redirect(new URL('/?error=missing_code', request.url));
  }

  try {
    const authData = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = authData.body;

    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
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
    
    response.cookies.set({
      name: 'spotify_refresh_token',
      value: refresh_token,
      maxAge: 60 * 60 * 24 * 30, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
    });

    return response;
  } catch (error) {
    console.error('Error during callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.redirect(new URL(`/?error=callback_error&details=${encodeURIComponent(errorMessage)}`, request.url));
  }
} 