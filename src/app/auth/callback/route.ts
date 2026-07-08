import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// OAuth landing spot (PKCE flow): after the Google consent screen, Supabase
// redirects the browser here with a one-time `code`, which is exchanged for a
// session — the auth cookies ride out on the redirect response. Any failure
// (missing/expired/reused code) still lands on the homepage, just signed out:
// a sign-in hiccup is never worth an error page.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = createClient(await cookies());
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(origin);
}
