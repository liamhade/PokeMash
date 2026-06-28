import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Returns the distinct `cards.rarity` values for the Rarity filter dropdown.
// Backed by the `distinct_rarities()` Postgres function because PostgREST can't
// SELECT DISTINCT and caps plain selects below the full card count.
export async function GET() {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase.rpc("distinct_rarities");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rarities: data ?? [] });
}
