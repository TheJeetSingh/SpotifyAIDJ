import { NextResponse } from 'next/server';
import { LOGIN_URL } from '@/lib/spotify';

export async function GET() {
  return NextResponse.redirect(LOGIN_URL);
} 