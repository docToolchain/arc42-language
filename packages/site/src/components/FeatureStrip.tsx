interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    icon: <FileTextIcon />,
    title: "Human-readable first",
    desc: "Write in plain Markdown. Read in any editor. No tooling required to understand your docs.",
  },
  {
    icon: <BotIcon />,
    title: "Agent-writable",
    desc: "AI agents produce valid workspaces from a single syntax reference — no hallucinated structure.",
  },
  {
    icon: <ShieldIcon />,
    title: "Drift detection",
    desc: "Broken references, stale decisions, orphaned components — caught before merge, not in a review meeting.",
  },
  {
    icon: <MonitorIcon />,
    title: "Live viewer",
    desc: "`arc42 serve` renders your workspace as a navigable, cross-linked site. Keep it open while you code.",
  },
];

export function FeatureStrip() {
  return (
    <section className="section" aria-label="Features" id="features">
      <div className="container">
        <div className="features" role="list">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature" role="listitem">
              <div className="feature__icon" aria-hidden="true">
                {f.icon}
              </div>
              <h3 className="feature__title">{f.title}</h3>
              <p className="feature__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FileTextIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M12 2a3 3 0 010 6" />
      <path d="M12 2a3 3 0 000 6" />
      <line x1="12" y1="8" x2="12" y2="11" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
