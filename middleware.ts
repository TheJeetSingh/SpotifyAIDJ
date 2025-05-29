import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define paths that are considered public (don't require authentication)
  const isPublicPath = path === '/' || 
    path.startsWith('/api/auth') || 
    path === '/favicon.ico' ||
    path.startsWith('/_next/');

  // Get the tokens from cookies
  const accessToken = request.cookies.get('spotify_access_token')?.value || '';
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value || '';

  // If trying to access protected route without token, redirect to login
  if (!isPublicPath && !accessToken) {
    // If we have a refresh token, try to use the refresh endpoint
    if (refreshToken) {
      const refreshUrl = new URL('/api/auth/refresh', request.url);
      return NextResponse.redirect(refreshUrl);
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If trying to access login page with token, redirect to dashboard
  if (path === '/' && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/', '/dashboard/:path*', '/api/:path*'],
}; 