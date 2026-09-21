import type { Metadata } from "next";
import { SignInForm } from "@/components/landing/SignInForm";
import { TagField } from "@/components/landing/TagField";
import { APP_NAME } from "@/lib/config";
import { countPins } from "@/lib/pins/repository";

export const metadata: Metadata = {
  title: `${APP_NAME} — find Asian Americans near you`,
};

export const revalidate = 60;

/** Reads as a sentence, and says nothing when there is nobody to count yet. */
function peopleLine(count: number): string | null {
  if (count === 0) return null;
  if (count === 1) return "One person is on the map so far.";
  return `${count.toLocaleString()} people are on the map.`;
}

export default async function Landing() {
  const people = peopleLine(await countPins());

  return (
    <main className="relative min-h-dvh overflow-hidden bg-land-100">
      <TagField />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-6 py-16 sm:px-10">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-text-secondary">{APP_NAME}</p>

          <h1 className="mt-3 text-4xl leading-[1.08] font-semibold text-text-primary sm:text-5xl">
            Find Asian Americans near you, and let them find you.
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-text-body">
            Los Angeles has no single Japantown any more. Sawtelle and Little Tokyo are still here,
            but the community they once held is spread across the basin, and most cities have the
            same story. This is a map of where people actually are, wherever you live.
          </p>

          {people ? <p className="mt-3 text-[0.9375rem] text-person-text">{people}</p> : null}

          <div className="mt-8 max-w-sm rounded-sheet bg-bg-surface p-5 shadow-lg">
            <SignInForm />
          </div>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-text-secondary">
            Your name and neighborhood show on the map. Your email is shown only to other people who
            are on it, and you can take yourself off at any time.
          </p>
        </div>
      </div>
    </main>
  );
}
