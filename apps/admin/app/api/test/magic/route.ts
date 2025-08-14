import { NextResponse } from 'next/server';

export async function GET() {
  const url = (globalThis as any).__lastMagicURL || null;
  return NextResponse.json({ url });
}


