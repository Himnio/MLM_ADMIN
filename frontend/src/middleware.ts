import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith('/api/v1')) {
    const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
    const BACKEND_PORT = process.env.BACKEND_PORT || '8080';
    try {
      const url = new URL(pathname + search, `http://${BACKEND_HOST}:${BACKEND_PORT}`);
      return NextResponse.rewrite(url);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Backend unreachable.' },
        { status: 502 },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/v1/:path*',
};
