import { Nav } from "./Nav";
import { Footer } from "./Footer";
import diffVideo from "../../../../demo/diff-demo.mp4";
import summaryShot from "../../../../demo/diff/01-changes-summary.png";
import diagramShot from "../../../../demo/diff/02-diagram-source.png";
import catalogShot from "../../../../demo/diff/04-catalog-changes.png";
import warningShot from "../../../../demo/diff/07-warning-target.png";
import messageShot from "../../../../demo/diff/09-history-commit-message.png";

const REPO = "https://github.com/docToolchain/arc42-language";
const SHOWCASE_PR = `${REPO}/pull/94`;

/** The commits of the bookstore story (scripts/bookstore-evolution.ts). */
const STORY = [
  {
    subject: "feat: add book recommendations",
    shows: "A new service and its API, wired to the gateway, drawn in the overview, deployed.",
  },
  {
    subject: "perf: move catalog search to Go",
    shows: "A technology change with rewritten prose — and a new decision explaining why.",
  },
  {
    subject: "style: reflow the API Gateway section",
    shows: "Formatting only. The model did not change, so neither does the diff.",
  },
  {
    subject: "refactor: rename Response Cache to Read Cache",
    shows: "A renamed section stays one section: it still defines the same element.",
  },
  {
    subject: "chore: retire SMS notifications and move to SQS FIFO",
    shows: "A removal — and a queue that changed while its description did not: drift.",
  },
];

interface Highlight {
  title: string;
  text: React.ReactNode;
  image: string;
  alt: string;
}

const HIGHLIGHTS: Highlight[] = [
  {
    title: "Changes where they live",
    text: (
      <>
        Every changed chapter renders in full, with its changed sections marked in place. Only the
        changed words and values are highlighted — and a switch shows the section as it is now or as
        it was, without marks.
      </>
    ),
    image: catalogShot,
    alt: "The Catalog Service section: technology Node.js / Express replaced by Go, rewritten words marked",
  },
  {
    title: "The model, not the lines",
    text: (
      <>
        arc42 compares the parsed architecture: elements and diagrams by id, relations by their
        ends, prose by its text. Reflowed paragraphs are no change, a renamed heading is no removal,
        and a diagram source shows exactly the lines that changed.
      </>
    ),
    image: diagramShot,
    alt: "The overview diagram's source as a line diff: the new service added, the catalog's technology changed",
  },
  {
    title: "Drift, flagged before merge",
    text: (
      <>
        When a block changes but the prose around it does not — or the other way round — the
        documentation has started to drift from the model. The lint warns and links straight to the
        element. Run it in a pre-commit hook with <code>arc42 diff --staged</code>.
      </>
    ),
    image: warningShot,
    alt: "The Message Queue section: technology changed to AWS SQS FIFO while its prose is unchanged",
  },
  {
    title: "A history of your architecture",
    text: (
      <>
        Every commit that touched the architecture is a pearl. Open one to see that version&apos;s
        change, with its commit message above it — or browse that version as a whole, every chapter
        as it was. Formatting-only commits stay small and neutral — nothing to review there.
      </>
    ),
    image: messageShot,
    alt: "The history: the commit 'feat: add book recommendations' with its rendered message and its change",
  },
];

export function EvolutionPage() {
  return (
    <>
      <Nav home="../" />
      <main>
        <section className="hero evo-hero" aria-label="Introduction">
          <div className="container hero__inner">
            <p className="hero__eyebrow">Architecture · Evolution · Drift</p>
            <h1 className="hero__headline">
              See how your architecture
              <br />
              <em>evolves.</em>
            </h1>
            <p className="hero__sub evo-hero__sub">
              arc42 compares the architecture of two versions — the model, not the text — shows
              every change where it lives, and flags documentation drifting from the model before it
              is merged.
            </p>
            <div className="hero__ctas">
              <a href="../bookstore-evolution/" className="btn btn--primary">
                Open the interactive diff →
              </a>
              <a href={SHOWCASE_PR} className="btn btn--outline">
                See it on a pull request →
              </a>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="evo-demo-heading">
          <div className="container">
            <header className="gs__header">
              <h2 className="gs__title" id="evo-demo-heading">
                The bookstore, one release later
              </h2>
              <p className="gs__sub">
                The bookstore example at <code>v1.0</code>, four commits and one uncommitted change
                later — shown by <code>arc42 serve --diff v1.0</code>.
              </p>
            </header>
            <video
              className="evo-video"
              src={diffVideo}
              poster={summaryShot}
              controls
              muted
              loop
              playsInline
              preload="metadata"
            />
            <ol className="evo-story">
              {STORY.map((step) => (
                <li key={step.subject}>
                  <code>{step.subject}</code>
                  <span>{step.shows}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {HIGHLIGHTS.map((highlight, index) => (
          <section className="section" key={highlight.title} aria-label={highlight.title}>
            <div className={["container", "evo-row", index % 2 ? "evo-row--flip" : ""].join(" ")}>
              <div className="evo-row__text">
                <h2 className="gs__title">{highlight.title}</h2>
                <p className="evo-row__desc">{highlight.text}</p>
              </div>
              <a href={highlight.image} className="evo-row__zoom" title="Open full size">
                <img
                  className="evo-row__image"
                  src={highlight.image}
                  alt={highlight.alt}
                  loading="lazy"
                />
              </a>
            </div>
          </section>
        ))}

        <section className="section" aria-labelledby="evo-pr-heading">
          <div className="container evo-row">
            <div className="evo-row__text">
              <h2 className="gs__title" id="evo-pr-heading">
                In every pull request
              </h2>
              <p className="evo-row__desc">
                A GitHub Actions workflow compares each workspace with the merge base, uploads the
                rendered review as a single HTML page and keeps one comment on the pull request up
                to date: what changed, which warnings need attention, and which elements&apos; code
                changed while their architecture did not.
              </p>
              <p className="evo-row__desc">
                <a href={SHOWCASE_PR}>See the bookstore story as a pull request →</a>
                <br />
                <a href={`${REPO}/blob/main/.github/workflows/architecture-review.yml`}>
                  The workflow →
                </a>
              </p>
            </div>
            <a href={summaryShot} className="evo-row__zoom" title="Open full size">
              <img
                className="evo-row__image"
                src={summaryShot}
                alt="The Changes summary: a drift warning, then the changed chapters and their elements"
                loading="lazy"
              />
            </a>
          </div>
        </section>

        <section className="section" aria-labelledby="evo-try-heading">
          <div className="container">
            <header className="gs__header">
              <h2 className="gs__title" id="evo-try-heading">
                Try it on your repository
              </h2>
            </header>
            <div className="gs__grid gs__grid--3">
              <div className="gs__card">
                <div className="gs__card-label">Before you commit</div>
                <h3 className="gs__card-title">Lint the staged change</h3>
                <div className="gs__snippet">
                  <code>arc42 diff --staged</code>
                </div>
              </div>
              <div className="gs__card">
                <div className="gs__card-label">While you work</div>
                <h3 className="gs__card-title">See your branch, live</h3>
                <div className="gs__snippet">
                  <code>arc42 serve --diff origin/main</code>
                </div>
              </div>
              <div className="gs__card">
                <div className="gs__card-label">For a review</div>
                <h3 className="gs__card-title">One page to share</h3>
                <div className="gs__snippet">
                  <code>arc42 build --out review --diff origin/main...HEAD --single-file</code>
                </div>
              </div>
            </div>
            <p className="evo-footnote">
              <code>arc42 build --with-history</code> adds the history of pearls to any static site
              — every version browsable, parsed right in the browser.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
