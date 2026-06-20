import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

async function proxy(request: NextRequest) {
  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, BACKEND_URL);

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    (init as any).duplex = 'half';
    init.body = await request.text();
  }

  try {
    const backendRes = await fetch(url.toString(), init);

    const resHeaders = new Headers(backendRes.headers);
    resHeaders.delete('content-encoding');

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: 'Backend unreachable.' },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const OPTIONS = proxy;
