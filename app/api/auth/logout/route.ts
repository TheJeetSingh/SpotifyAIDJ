import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    response.cookies.set({
      name: 'spotify_access_token',
      value: '',
      path: '/',
      maxAge: 0, 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax', 
    });

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Logout failed', details: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.delete('spotify_access_token');
  response.cookies.delete('spotify_refresh_token');
  
  return response;
} 