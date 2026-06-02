/**
 * Landing — root page (replaces the old 5-line redirect to /dashboard).
 *
 * Three sections: Hero → JourneyTimeline → EntryCards.
 * The "v1" redirect to /dashboard is gone; deep links to /dashboard still
 * work because that route exists independently.
 */

import Hero from "./landing/Hero";
import JourneyTimeline from "./landing/JourneyTimeline";
import EntryCards from "./landing/EntryCards";

export default function Home() {
  return (
    <main className="bg-white">
      <Hero />
      <JourneyTimeline />
      <EntryCards />
    </main>
  );
}
