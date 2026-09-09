import type { Verdict } from "../verdicts";

// Accent colors per card index (chapter palette)
const CARD_COLORS = ["var(--c-ch5)", "var(--c-ch3)", "var(--c-ch6)", "var(--c-ch8)"];

interface VerdictCardProps {
  verdict: Verdict;
  index: number;
}

export function VerdictCard({ verdict, index }: VerdictCardProps) {
  const color = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <article className="verdict-card" aria-label={`Verdict: ${verdict.title}`}>
      <div className="verdict-card__stripe" style={{ background: color }} aria-hidden="true" />
      <div className="verdict-card__body">
        <div className="verdict-card__meta">
          <span
            className="badge badge--filled"
            style={{ background: color }}
            aria-label={`Model: ${verdict.model}`}
          >
            {verdict.model}
          </span>
          <span className="badge badge--outline" aria-label={`Harness: ${verdict.harness}`}>
            {verdict.harness}
          </span>
          {verdict.date && (
            <span className="verdict-card__date">
              <time dateTime={verdict.date}>{verdict.date}</time>
            </span>
          )}
        </div>
        {verdict.task && <p className="verdict-card__task">{verdict.task}</p>}
        {verdict.tldr && <p className="verdict-card__tldr">{verdict.tldr}</p>}
        <div className="verdict-card__footer">
          <a
            href={`https://github.com/doctoolchain/arc42-language/blob/main/docs/verdicts/${verdict.slug}.md`}
            className="verdict-card__link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Read full verdict by ${verdict.model}`}
          >
            Read full verdict →
          </a>
        </div>
      </div>
    </article>
  );
}
