export function GettingStarted() {
  return (
    <section className="section" aria-labelledby="getting-started-heading" id="getting-started">
      <div className="container">
        <header className="gs__header">
          <h2 className="gs__title" id="getting-started-heading">
            Get started
          </h2>
        </header>
        <div className="gs__grid gs__grid--3">
          <div className="gs__card">
            <div className="gs__card-label">Impatient developer</div>
            <h3 className="gs__card-title">Install the skill</h3>
            <p className="gs__card-desc">
              Drops the arc42 DSL syntax, authoring rules, and migration workflow into your agent as
              a built-in skill.
            </p>
            <div className="gs__snippet">
              <code>npx skills add doctoolchain/arc42-language</code>
            </div>
          </div>
          <div className="gs__card">
            <div className="gs__card-label">AI agent</div>
            <h3 className="gs__card-title">Use the CLI</h3>
            <p className="gs__card-desc">
              Run the CLI directly. <code>--help</code> lists all commands.{" "}
              <code>arc42 guide migration</code> walks the full workflow.
            </p>
            <div className="gs__snippet">
              <code>npx @doctc/arc42 --help</code>
            </div>
          </div>
          <div className="gs__card">
            <div className="gs__card-label">Want to understand it</div>
            <h3 className="gs__card-title">Read the README</h3>
            <p className="gs__card-desc">
              Format reference, validation rules, CLI commands, and design decisions — all in one
              place.
            </p>
            <a
              href="https://github.com/docToolchain/arc42-language#readme"
              className="gs__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open README ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
