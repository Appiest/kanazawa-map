import type { Metadata } from "next";
import { SignInForm } from "@/components/landing/SignInForm";
import { TagField } from "@/components/landing/TagField";
import { MarkerGlyph } from "@/components/ui/MarkerGlyph";
import { SiteFrame } from "@/components/ui/SiteFrame";
import { APP_NAME } from "@/lib/config";
import { LANDING, SITE, peopleLine } from "@/lib/content";
import { countPins } from "@/lib/pins/repository";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${SITE.tagline}`,
};

export const revalidate = 60;

function Benefits() {
  return (
    <ul className="space-y-6">
      {LANDING.benefits.map((benefit) => (
        <li key={benefit.title} className="grid grid-cols-[3.5rem_1fr] items-start gap-x-4">
          <span className="flex h-9 items-end justify-center gap-1.5">
            {benefit.markers.map((kind) => (
              <MarkerGlyph key={kind} kind={kind} height={34} />
            ))}
          </span>
          <span>
            <span className="block text-xl font-semibold text-text-primary">{benefit.title}</span>
            <span className="mt-1 block text-[0.9375rem] leading-relaxed text-text-secondary">
              {benefit.detail}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function Landing() {
  const people = peopleLine(await countPins());

  return (
    <SiteFrame fit="page">
      <main className="relative h-full">
        <TagField />

        <div className="relative mx-auto grid max-w-6xl gap-x-16 gap-y-12 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[minmax(0,36rem)_1fr]">
          <div>
            <p className="text-sm font-medium text-text-secondary">{APP_NAME}</p>

            <h1 className="mt-3 text-4xl leading-[1.08] font-semibold text-balance text-text-primary sm:text-5xl">
              {LANDING.headline}
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-pretty text-text-body">{LANDING.intro}</p>

            {people ? <p className="mt-3 text-[0.9375rem] text-person-text">{people}</p> : null}

            <div className="mt-8 max-w-sm rounded-sheet bg-bg-surface p-5 shadow-lg">
              <SignInForm />
            </div>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-text-secondary">{LANDING.privacy}</p>
          </div>

          <div className="lg:pt-24">
            <Benefits />
          </div>
        </div>
      </main>
    </SiteFrame>
  );
}
