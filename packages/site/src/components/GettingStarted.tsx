export function GettingStarted() {
  return (
    <section className="section" aria-labelledby="getting-started-heading" id="getting-started">
      <div className="container">
        <header className="gs__header">
          <h2 className="gs__title" id="getting-started-heading">
            Get started
          </h2>
          <p className="gs__sub">
            Two paths — pick the one that fits your setup. Full reference in the{" "}
            <a
              href="https://github.com/docToolchain/arc42-language#readme"
              target="_blank"
              rel="noopener noreferrer"
            >
              README ↗
            </a>
            .
          </p>
        </header>
        <div className="gs__grid">
          <div className="gs__card">
            <div className="gs__card-label">For AI agents</div>
            <h3 className="gs__card-title">Install the skill</h3>
            <p className="gs__card-desc">
              Gives your agent the arc42 DSL syntax, authoring rules, and the{" "}
              <code>arc42 guide migration</code> workflow as a built-in skill.
            </p>
            <div className="gs__snippet">
              <code>npx skills add doctoolchain/arc42-language</code>
            </div>
          </div>
          <div className="gs__card">
            <div className="gs__card-label">For humans</div>
            <h3 className="gs__card-title">Explore the CLI</h3>
            <p className="gs__card-desc">
              Run the CLI directly. Use <code>--help</code> to discover commands, or{" "}
              <code>arc42 serve</code> to render your workspace in the browser.
            </p>
            <div className="gs__snippet">
              <code>npx @doctc/arc42 --help</code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
