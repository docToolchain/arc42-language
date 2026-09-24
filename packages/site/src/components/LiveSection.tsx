export function LiveSection() {
  return (
    <section className="section" aria-labelledby="live-heading" id="examples">
      <div className="container">
        <h2 className="live__title" id="live-heading">
          See it live
        </h2>
        <p className="live__sub">
          Three real workspaces, built with <code>arc42 build</code> and deployed here.
        </p>
        <div className="live__grid">
          <a href="./docs/" className="live-card" aria-label="View architecture docs workspace">
            <div className="live-card__icon" aria-hidden="true">
              <BookIcon />
            </div>
            <h3 className="live-card__title">Architecture Docs</h3>
            <p className="live-card__desc">
              The project's own arc42 workspace. 12 chapters, all cross-linked. This is the tool
              eating its own dog food.
            </p>
            <span className="live-card__arrow" aria-hidden="true">
              Open →
            </span>
          </a>
          <a
            href="./bookstore/"
            className="live-card"
            aria-label="View bookstore example workspace"
          >
            <div className="live-card__icon" aria-hidden="true">
              <LayersIcon />
            </div>
            <h3 className="live-card__title">Bookstore Example</h3>
            <p className="live-card__desc">
              A complete e-commerce backend documented with arc42. A realistic reference for new
              workspaces.
            </p>
            <span className="live-card__arrow" aria-hidden="true">
              Open →
            </span>
          </a>
          <a
            href="./kanban-board/"
            className="live-card"
            aria-label="View kanban-board AsciiDoc example workspace"
          >
            <div className="live-card__icon" aria-hidden="true">
              <KanbanIcon />
            </div>
            <h3 className="live-card__title">Kanban Board (AsciiDoc)</h3>
            <p className="live-card__desc">
              The same arc42 DSL written in AsciiDoc notation. Demonstrates multi-service
              architecture with event sourcing and GDPR constraints.
            </p>
            <span className="live-card__arrow" aria-hidden="true">
              Open →
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

function BookIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v10" />
      <path d="M15 3v6" />
    </svg>
  );
}
