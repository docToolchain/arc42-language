import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { GettingStarted } from "./components/GettingStarted";
import { FeatureStrip } from "./components/FeatureStrip";
import { VerdictSection } from "./components/VerdictSection";
import { LiveSection } from "./components/LiveSection";
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
      </main>
      <Footer />
    </>
  );
}
