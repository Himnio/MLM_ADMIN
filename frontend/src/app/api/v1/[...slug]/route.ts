import { NextRequest, NextResponse } from 'next/server';

const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '8080';

async function handler(request: NextRequest) {
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `http://${BACKEND_HOST}:${BACKEND_PORT}`);
  return NextResponse.rewrite(url);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
