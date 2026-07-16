import { NextResponse } from "next/server";

// Same-origin proxy for the Supabase `card-art` storage bucket.
//
// Serving art from our own domain lets the CDN edge and browsers cache each file
// long-term instead of re-downloading from Supabase on every view — storage egress
// is metered (free tier ~5GB/month), CDN bandwidth is effectively free. The files
// are immutable by construction (backfill-card-art.ts writes each {card_id}.webp
// once and never overwrites; changed art would get a new card_id), so the year-long
// `immutable` header below is safe: nothing ever needs revalidation.
//
// Vercel's edge caches function responses that carry `s-maxage` (stripped from the
// client response); `max-age` + `immutable` is what browsers keep. The edge cache is
// per-region and flushed on every deploy, so Supabase still sees roughly one fetch
// per card per region per deploy — browsers hold their copies across deploys.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Object names are strictly {uuid}.webp. Anything else 404s without touching
// Supabase — this also blocks encoded path traversal (`..%2F`) out of the bucket.
const ART_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!SUPABASE_URL || !ART_FILE_PATTERN.test(file)) {
    return new NextResponse(null, { status: 404 });
  }

  // no-store: keep the image bytes out of Next's fetch/data cache — the CDN edge
  // cache (via the response headers below) is the caching layer for this route.
  const upstream = await fetch(
    `${SUPABASE_URL}/storage/v1/object/public/card-art/${file}`,
    { cache: "no-store" },
  );
  if (!upstream.ok || !upstream.body) {
    // A miss means art_url was stamped but the object is gone — anomalous, so
    // don't let the CDN memorize it; the next request re-checks Supabase.
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
