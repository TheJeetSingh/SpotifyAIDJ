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

    // Create response and set cookies
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    
    // Set cookies with HttpOnly for security
    response.cookies.set({
      name: 'spotify_access_token',
      value: access_token,
      maxAge: expires_in,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    response.cookies.set({
      name: 'spotify_refresh_token',
      value: refresh_token,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error during callback:', error);
    return NextResponse.redirect(new URL('/?error=callback_error', request.url));
  }
} 