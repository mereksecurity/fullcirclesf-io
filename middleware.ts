// Vercel Edge Middleware - HTTP Basic Auth gate
export const config = {
  matcher: ['/((?!_next|_vercel|favicon.ico).*)'],
  };

  const PASSWORD = 'fullcircle';

  export default function middleware(request: Request): Response | undefined {
    const auth = request.headers.get('authorization') || '';
      if (auth.startsWith('Basic ')) {
          try {
                const decoded = atob(auth.slice(6));
                      const colon = decoded.indexOf(':');
                            const pass = colon === -1 ? '' : decoded.slice(colon + 1);
                                  if (pass === PASSWORD) return;
                                      } catch (e) {
                                            // fall through
                                                }
                                                  }
                                                    return new Response('Authentication required', {
                                                        status: 401,
                                                            headers: {
                                                                  'WWW-Authenticate': 'Basic realm="Full Circle Santa Fe Preview"',
                                                                        'Content-Type': 'text/plain',
                                                                            },
                                                                              });
                                                                              }
                                                                              
