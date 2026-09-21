import type { Metadata } from "next";
import { Queue } from "@/components/moderate/Queue";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: `Reports — ${APP_NAME}`,
  robots: { index: false, follow: false },
};

export default function ModeratePage() {
  return (
    <main className="min-h-dvh bg-land-100 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-text-primary">Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Pins that people on the map have flagged.
        </p>
        <div className="mt-8">
          <Queue />
        </div>
      </div>
    </main>
  );
}
