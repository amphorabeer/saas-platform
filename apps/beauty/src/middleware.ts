export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/staff/:path*',
    '/services/:path*',
    '/settings/:path*',
    '/appointments/:path*',
    '/clients/:path*',
    '/pos/:path*',
    '/inventory/:path*',
    '/reports/:path*',
    '/finance/:path*',
    '/loyalty/:path*',
    '/reviews/:path*',
    '/booking/:path*',
    '/ai/:path*',
  ],
};
