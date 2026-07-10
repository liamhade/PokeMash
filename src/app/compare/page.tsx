import ComparisonScreen from "./ComparisonScreen";

// ?seed=<card_id> loads that specific card into the board on arrival — the
// "Compare" button on a Rankings card links here. Read server-side and passed
// as a prop so the client screen needs no useSearchParams/Suspense boundary.
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}) {
  const { seed } = await searchParams;
  return <ComparisonScreen seedCardId={seed} />;
}
