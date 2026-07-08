import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — PokeMash",
  description: "What PokeMash stores about you and why.",
};

// Plain-language privacy policy, linked from the sign-in modal. Keep it honest
// and current: if the app ever starts collecting something new (analytics,
// ads, more profile fields), this page must change in the same PR.
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold text-neutral-800">Privacy Policy</h1>
      <p className="mb-8 text-sm text-neutral-400">Last updated July 7, 2026</p>

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
            Buy links
          </h2>
          <p>
            &ldquo;Buy on TCGplayer&rdquo; buttons are affiliate links. Clicking
            one takes you to TCGplayer; we send them nothing about you.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-neutral-800">
            Your choices
          </h2>
          <p>
            You can use PokeMash without an account, and sign out at any time.
            To delete your account and everything stored under it, open an
            issue at{" "}
            <a
              href="https://github.com/liamhade/PokeMash/issues"
              className="underline hover:text-neutral-800"
            >
              github.com/liamhade/PokeMash
            </a>{" "}
            and we&rsquo;ll take care of it.
          </p>
        </section>
      </div>
    </div>
  );
}
