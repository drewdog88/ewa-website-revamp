import { next } from '@vercel/edge';

// Edge-level block for AI training/scraping bots.
// This enforces at the network edge what public/robots.txt only requests
// politely — misbehaving crawlers that ignore robots.txt get a hard 403.
//
// Googlebot, Bingbot, and normal visitors are unaffected. Blocking
// Google-Extended here does NOT hurt Google Search indexing.
export const config = {
  // Run only on page navigations, not static assets — keeps middleware
  // invocations (and cost) minimal. Skips /assets/* and any path with a
  // file extension (.js, .css, .png, .svg, .ico, ...).
  matcher: ['/((?!assets/|.*\\.\\w+$).*)'],
};

const BLOCKED_BOTS =
  /(GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|Google-Extended|Applebot-Extended|CCBot|PerplexityBot|Bytespider|Amazonbot|meta-externalagent|FacebookBot|Diffbot|Omgili(bot)?|ImagesiftBot|YouBot|cohere-ai|PetalBot|Timpibot)/i;

export default function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') ?? '';

  if (BLOCKED_BOTS.test(userAgent)) {
    return new Response('Access denied. This site does not permit AI scraping.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return next();
}
