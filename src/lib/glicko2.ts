// Glicko-2 rating algorithm (Glickman, 2001) for a single pairwise comparison.
// Ratings are stored on the Glicko-2 scale's "display" form: r (rating), rd (rating
// deviation), mu (volatility) — matching the `card_ranks` table columns.

const SCALE = 173.7178;
const TAU = 0.5; // system constant constraining volatility change

export interface GlickoRating {
  r: number;
  rd: number;
  mu: number;
}

function toGlickoScale(rating: GlickoRating) {
  return {
    mu: (rating.r - 1500) / SCALE,
    phi: rating.rd / SCALE,
    sigma: rating.mu,
  };
}

function fromGlickoScale(mu: number, phi: number, sigma: number): GlickoRating {
  return {
    r: mu * SCALE + 1500,
    rd: phi * SCALE,
    mu: sigma,
  };
}

function g(phi: number) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, muOpponent: number, phiOpponent: number) {
  return 1 / (1 + Math.exp(-g(phiOpponent) * (mu - muOpponent)));
}

/**
 * Updates a player's (here: a card's) rating after a single result against one opponent.
 * `score` is 1 for a win, 0 for a loss.
 */
export function updateRating(player: GlickoRating, opponent: GlickoRating, score: 0 | 1): GlickoRating {
  const a = toGlickoScale(player);
  const b = toGlickoScale(opponent);

  const gPhiB = g(b.phi);
  const e = E(a.mu, b.mu, b.phi);
  const v = 1 / (gPhiB * gPhiB * e * (1 - e));
  const delta = v * gPhiB * (score - e);

  // Iteratively solve for the new volatility sigma' (Illinois algorithm).
  const a_ = Math.log(a.sigma * a.sigma);
  const f = (x: number) => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - a.phi * a.phi - v - ex);
    const den = 2 * (a.phi * a.phi + v + ex) * (a.phi * a.phi + v + ex);
    return num / den - (x - a_) / (TAU * TAU);
  };

  let A = a_;
  let B: number;
  if (delta * delta > a.phi * a.phi + v) {
    B = Math.log(delta * delta - a.phi * a.phi - v);
  } else {
    let k = 1;
    while (f(a_ - k * TAU) < 0) k += 1;
    B = a_ - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  const newSigma = Math.exp(A / 2);
  const phiStar = Math.sqrt(a.phi * a.phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = a.mu + newPhi * newPhi * gPhiB * (score - e);

  return fromGlickoScale(newMu, newPhi, newSigma);
}

export const DEFAULT_RATING: GlickoRating = { r: 1500, rd: 350, mu: 0.06 };
