// Recomputes comparison-pool eligibility and stages it for `cards.eligible`.
//
// The rules live in src/lib/comparisonPool.ts (isPoolEligible); this script
// evaluates them over the whole catalog and writes the eligible card_ids into
// public.eligible_stage (which the publishable key may fill). Syncing the ids
// into cards.eligible needs DB-admin access, so the script finishes by printing
// the two UPDATE statements to run (Supabase SQL editor or MCP execute_sql).
//
// Run with: npx tsx scripts/stamp-eligibility.ts
// Re-run after importing new sets or changing the rules — and follow up with
// scripts/backfill-card-art.ts so newly eligible cards get storage art.

import { readFileSync } from "node:fs";
import { isPoolEligible } from "../src/lib/comparisonPool";

const PAGE_SIZE = 1000;

function loadEnv(): { url: string; key: string } {
  const lines = readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n");
  const env = Object.fromEntries(
    lines.filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing Supabase URL/key in .env.local");
  return { url, key };
}

const { url: SUPABASE_URL, key: ANON_KEY } = loadEnv();

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`REST ${path}: ${res.status} ${await res.text()}`);
  return res;
}

type Row = {
  card_id: string;
  name: string;
  rarity: string | null;
  release_date: string | null;
  pack: string | null;
  collector_number: string | null;
};

async function main() {
  // Evaluate the rules over the full catalog. Rows with no rarity can't be
  // judged; they stay out of the pool.
  const eligible: string[] = [];
  let total = 0;
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = (await (
      await rest(
        `cards?select=card_id,name,rarity,release_date,pack,collector_number&order=card_id&limit=${PAGE_SIZE}&offset=${from}`,
      )
    ).json()) as Row[];
    total += page.length;
    for (const row of page) {
      if (row.rarity !== null && isPoolEligible({ ...row, rarity: row.rarity })) {
        eligible.push(row.card_id);
      }
    }
    if (page.length < PAGE_SIZE) break;
  }
  console.log(`${total} cards scanned, ${eligible.length} eligible`);

  // Replace the stage's contents. (PostgREST requires a filter on DELETE; this
  // one matches every row.)
  await rest("eligible_stage?card_id=not.is.null", { method: "DELETE" });
  for (let i = 0; i < eligible.length; i += PAGE_SIZE) {
    await rest("eligible_stage", {
      method: "POST",
      body: JSON.stringify(eligible.slice(i, i + PAGE_SIZE).map((card_id) => ({ card_id }))),
    });
  }

  // Confirm the stage holds exactly what we computed before telling anyone to sync.
  const head = await rest("eligible_stage?select=card_id&limit=1", {
    method: "HEAD",
    headers: { Prefer: "count=exact" },
  });
  const staged = Number(head.headers.get("content-range")?.split("/")[1]);
  if (staged !== eligible.length) {
    throw new Error(`stage holds ${staged} rows, expected ${eligible.length}`);
  }

  console.log(`staged ${staged} ids — now sync cards.eligible by running:\n`);
  console.log(
    `update public.cards set eligible = false
  where eligible and card_id not in (select card_id from public.eligible_stage);
update public.cards set eligible = true
  where not eligible and card_id in (select card_id from public.eligible_stage);`,
  );
}

main();
