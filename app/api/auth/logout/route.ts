import { NextRequest, NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear the access token cookie by setting its maxAge to 0
    response.cookies.set({
      name: 'spotify_access_token',
      value: '',
      path: '/',
      maxAge: 0, // Expires immediately
      httpOnly: true, // Add if you set this during login
      secure: process.env.NODE_ENV === 'production', // Add if you set this during login
      sameSite: 'lax', // Add if you set this during login
    });

    // Clear the refresh token cookie if you are using one
    // response.cookies.set({
    //   name: 'spotify_refresh_token',
    //   value: '',
    //   path: '/',
    //   maxAge: 0,
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'lax',
    // });

    // Clear other cookies if needed, e.g., friend_code
    // response.cookies.set({
    //   name: 'user_friend_code',
    //   value: '',
    //   path: '/',
    //   maxAge: 0,
    // });

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Logout failed', details: errorMessage }, { status: 500 });
  }
}

// Also allow GET request for simple logout link if preferred, though POST is common for actions
export async function GET() {
  const response = NextResponse.json({ success: true });
  
  // Clear all auth cookies
  response.cookies.delete('spotify_access_token');
  response.cookies.delete('spotify_refresh_token');
  
  return response;
} 