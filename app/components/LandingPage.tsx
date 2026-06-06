import Link from "next/link";
import { ROUTE_MOODS } from "@/lib/monumation";
import { getMoodTheme } from "@/lib/mood-theme";
import {
  MISSION_TAGLINE,
  MISSION_TAGLINE_TR,
  PUBLIC_BENEFIT_PILLARS,
} from "@/lib/public-mission";

const LANDING_MOOD_BG: Record<string, string> = {
  heritage: "landing-mood-heritage",
  scenic: "landing-mood-scenic",
  arts: "landing-mood-arts",
  promenade: "landing-mood-promenade",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen font-heritage-body">
      <section className="landing-hero px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="font-arts-display text-[11px] font-bold uppercase tracking-[0.35em] text-[#c4a574]">
            Monumation
          </p>
          <h1 className="font-heritage-display mt-4 text-5xl font-semibold leading-[1.1] tracking-tight sm:text-7xl">
            Walk any city
            <span className="mt-2 block font-promenade-display text-3xl font-normal italic text-[#e8c4a8] sm:text-4xl">
              by mood, not mileage
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-[#d4c4b0]">
            {MISSION_TAGLINE_TR}
          </p>
          <Link
            href="/app"
            className="mood-btn-heritage mt-10 inline-block rounded-sm px-8 py-3.5 transition hover:brightness-110"
          >
            Enter the navigator
          </Link>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-center font-arts-display text-xs font-bold uppercase tracking-[0.3em] text-[#5c5670]">
            Choose your corridor
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {ROUTE_MOODS.map((mood) => {
              const theme = getMoodTheme(mood.id);
              return (
                <article
                  key={mood.id}
                  className={`${LANDING_MOOD_BG[mood.id]} p-6 sm:p-8`}
                  style={{
                    borderRadius:
                      mood.id === "scenic"
                        ? "1.75rem"
                        : mood.id === "arts"
                          ? "0"
                          : mood.id === "promenade"
                            ? "1rem"
                            : "0.25rem",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{theme.emoji}</span>
                    <div>
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70 ${theme.fontDisplay}`}
                      >
                        {theme.vibe}
                      </p>
                      <h2 className={`mt-1 text-xl font-semibold ${theme.fontDisplay}`}>
                        {mood.labelTr}
                      </h2>
                      <p className="mt-1 text-sm opacity-80">{mood.label}</p>
                      <p className="mt-3 text-sm leading-relaxed opacity-75">
                        {mood.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-[#c4a574]/30 bg-[#faf4ea] px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <p className="font-scenic-display text-center text-lg italic text-[#2f5d3a]">
            Why corridors matter
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {PUBLIC_BENEFIT_PILLARS.map((pillar) => (
              <article
                key={pillar.id}
                className="border-l-2 border-[#c4a574] bg-[#f5efe6] px-5 py-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7a3b12]">
                  {pillar.titleTr}
                </p>
                <p className="font-heritage-display mt-1 text-lg text-[#2c1810]">
                  {pillar.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#6b4c3b]">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-[#6b4c3b]">
            {MISSION_TAGLINE}
          </p>
        </div>
      </section>

      <footer className="border-t border-[#c4a574]/25 px-6 py-8 text-center text-sm text-[#6b4c3b]">
        <Link
          href="/app"
          className="font-promenade-display text-base italic text-[#9c4221] hover:underline"
        >
          Open navigator →
        </Link>
      </footer>
    </div>
  );
}
