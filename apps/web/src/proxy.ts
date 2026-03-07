import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // Do not allow access to /docs, /llms-full.txt, /llms.txt allow rest of the paths
    if (pathname === '/docs' || pathname === '/llms-full.txt' || pathname === '/llms.txt' || pathname === '/api') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};