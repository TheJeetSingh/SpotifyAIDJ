import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect(new URL('/', process.env.VERCEL_URL || 'http://localhost:3000'));
  
  // Clear cookies
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