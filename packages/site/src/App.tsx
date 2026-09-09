import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { GettingStarted } from "./components/GettingStarted";
import { FeatureStrip } from "./components/FeatureStrip";
import { VerdictSection } from "./components/VerdictSection";
import { LiveSection } from "./components/LiveSection";
import { ReadmeSection } from "./components/ReadmeSection";
import { Footer } from "./components/Footer";

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <GettingStarted />
        <FeatureStrip />
        <VerdictSection />
        <LiveSection />
        <ReadmeSection />
      </main>
      <Footer />
    </>
  );
}
