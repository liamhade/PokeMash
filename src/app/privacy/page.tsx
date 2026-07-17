import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — CardMash",
  description: "What CardMash stores about you and why.",
};

// Plain-language privacy policy, linked from the sign-in modal. Keep it honest
// and current: if the app ever starts collecting something new (analytics,
// ads, more profile fields), this page must change in the same PR.
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold text-neutral-800">Privacy Policy</h1>
      <p className="mb-8 text-sm text-neutral-400">Last updated July 16, 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-neutral-600">
        <section>
          <h2 className="mb-2 text-base font-semibold text-neutral-800">
            What we store
          </h2>
          <p>
            Without an account: a random anonymous identifier saved in your
            browser, plus the comparisons you make and the card ratings they
            produce. None of it is tied to who you are.
          </p>
          <p className="mt-2">
            If you sign in with Google: your email address and Google account
            identifier, handled by our authentication provider (Supabase Auth).
            We never see your Google password, and we don&rsquo;t request
            anything from your Google account beyond basic profile and email.
          </p>
          <p className="mt-2">
            With an account you also get a small profile: a display name
            (defaulted from your email, editable), an avatar you pick, a
            random friend code, and the list of friends you&rsquo;ve added.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-neutral-800">Friends</h2>
          <p>
            Nobody can look you up by email — the only way to be added as a
            friend is to give someone your friend code. Friends see your
            display name, your avatar, and your card rankings. Removing a
            friend ends that in both directions.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-neutral-800">
            What it&rsquo;s used for
          </h2>
          <p>
            One thing: producing your personal card rankings and letting them
            follow you across devices. We don&rsquo;t run ads, we don&rsquo;t
            build profiles, and we never sell or share your data with anyone.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-neutral-800">Cookies</h2>
          <p>
            The only cookies we set are the authentication session cookies
            needed to keep you signed in. There are no tracking or analytics
            cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-neutral-800">
            Analytics
          </h2>
          <p>
            We count page views with Vercel Web Analytics so we can tell which
            pages get visited and where visitors come from. It&rsquo;s
            cookieless and anonymous: no identifier is stored in your browser,
            and visits can&rsquo;t be traced back to you or linked to your
            rankings.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-neutral-800">
            Buy links
          </h2>
          <p>
            The TCGplayer and eBay buy buttons are affiliate links. Clicking
            one takes you to that store; we send them nothing about you.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-neutral-800">
            Your choices
          </h2>
          <p>
            You can use CardMash without an account, and sign out at any time.
            To delete your account and everything stored under it, email{" "}
            {/* The repo went private, so a GitHub-issues link would 404 for
                the public — deletion requests go to the same contact address
                the footer already publishes. */}
            <a
              href="mailto:cardmash.io@gmail.com"
              className="underline hover:text-neutral-800"
            >
              cardmash.io@gmail.com
            </a>{" "}
            and we&rsquo;ll take care of it.
          </p>
        </section>
      </div>
    </div>
  );
}
