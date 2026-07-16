// Imports a new set's card rows from tcgcsv (TCGplayer's catalog mirror) by
// printing the INSERT a DB admin runs — the first step of DEVELOPMENT.md's
// "Adding new sets" runbook, for sets pkmncards hasn't scanned yet.
//
// The catalog stays source-abstract: only the generic columns are filled
// (name / pack / set / rarity / collector_number / release_date / image_url),
// plus tcgplayer_product_id — known for free here, which lets the price refresh
// (runbook step 7) run immediately without the id backfill (step 6).
// image_url points at TCGplayer's aspect-preserved scan (~718×1000 — bigger
// than the 650w the art backfill resizes to); when pkmncards posts its scans,
// re-pointing image_url is optional, the art bucket is what actually serves.
//
// Writes nothing itself (tcgcsv is the only fetch): inserting into cards needs
// DB-admin access, so it prints the INSERT to run (SQL editor or MCP), guarded
// by pack+collector_number so a re-run can't duplicate rows. Then continue the
// runbook: exclusion list -> stamp-eligibility -> art backfill -> prices.
//
// Run with: npx tsx scripts/import-set.ts <tcgcsvGroupId> "<pack>" "<set>" "<Mon D, YYYY>"
// e.g.:     npx tsx scripts/import-set.ts 24688 "Pitch Black (PBL)" "Mega Evolution" "Jul 17, 2026"

// tcgcsv category 3 = Pokémon.
const TCGCSV = "https://tcgcsv.com/tcgplayer/3";

type Product = {
  productId: number;
  name: string;
  extendedData?: { name: string; value: string }[];
};

const [groupId, pack, set, releaseDate] = process.argv.slice(2);
if (!groupId || !pack || !set || !releaseDate) {
  console.error(
    'usage: npx tsx scripts/import-set.ts <tcgcsvGroupId> "<pack>" "<set>" "<Mon D, YYYY>"',
  );
  process.exit(1);
}

function sql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function main() {
  const res = await fetch(`${TCGCSV}/${groupId}/products`, {
    // tcgcsv 401s the default undici agent; any browser-ish/curl-ish UA passes.
    headers: { "User-Agent": "PokeMash-backfill/1.0" },
  });
  if (!res.ok) throw new Error(`tcgcsv ${groupId}/products: ${res.status}`);
  const products = ((await res.json()) as { results: Product[] }).results;

  // Singles carry a collector Number; the rest of the group is sealed product.
  const singles = products.filter((p) =>
    p.extendedData?.some((e) => e.name === "Number"),
  );
  if (singles.length === 0) throw new Error("group has no numbered singles");

  const values = singles.map((p) => {
    const ext = Object.fromEntries(p.extendedData!.map((e) => [e.name, e.value]));
    // Product names are inconsistently suffixed with the number ("Fomantis -
    // 003/084" next to a plain "Tropius"); the card name is what's before it.
    const name = p.name.replace(/\s+-\s+\d+\/\d+$/, "").trim();
    // The leading space matches the release_date format already in the catalog
    // (a scrape artifact, but consistent — every date reader trims first).
    return `(${sql(set)}, ${sql(pack)}, ${sql(name)}, ${sql(
      `https://tcgplayer-cdn.tcgplayer.com/product/${p.productId}_in_1000x1000.jpg`,
    )}, ${sql(ext.Rarity ?? "No Rarity")}, ${sql(ext.Number)}, ${sql(` ${releaseDate}`)}, ${p.productId})`;
  });

  console.log(`-- ${values.length} singles from tcgcsv group ${groupId} -> ${pack}`);
  console.log(`insert into public.cards
  (set, pack, name, image_url, rarity, collector_number, release_date, tcgplayer_product_id)
select v.*
from (values
${values.join(",\n")}
) as v(set, pack, name, image_url, rarity, collector_number, release_date, tcgplayer_product_id)
where not exists (
  select 1 from public.cards c
  where c.pack = v.pack and c.collector_number = v.collector_number
);`);
}

main();
