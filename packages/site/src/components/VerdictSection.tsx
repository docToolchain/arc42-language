import { verdicts } from "virtual:verdicts";
import { VerdictCard } from "./VerdictCard";

export function VerdictSection() {
  return (
    <section className="section" aria-labelledby="verdicts-heading" id="verdicts">
      <div className="container">
        <header className="verdicts__header">
          <h2 className="verdicts__title" id="verdicts-heading">
            Tested in the wild
          </h2>
          <p className="verdicts__sub">Real AI agents. Real codebases. Unscripted.</p>
        </header>
        <div className="verdicts__grid" role="list">
          {verdicts.map((v, i) => (
            <div key={v.slug} role="listitem">
              <VerdictCard verdict={v} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
