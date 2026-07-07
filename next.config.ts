import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Card art is served as-is: our own copies in Supabase Storage are already
    // resized WebPs, and the pkmncards.com fallbacks are near display size. Routing
    // them through Vercel's optimizer re-transforms ~7k unique images and blew
    // through the free tier's monthly transformation quota (every uncached card
    // then 402'd), so the optimizer stays off.
    unoptimized: true,
  },
};

export default nextConfig;
