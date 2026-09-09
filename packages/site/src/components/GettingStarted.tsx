export function GettingStarted() {
  return (
    <section className="section" aria-labelledby="getting-started-heading" id="getting-started">
      <div className="container">
        <header className="gs__header">
          <h2 className="gs__title" id="getting-started-heading">
            Get started
          </h2>
        </header>
        <div className="gs__grid gs__grid--2">
          <div className="gs__card">
            <div className="gs__card-label">Impatient developer</div>
            <h3 className="gs__card-title">Install the skill</h3>
            <p className="gs__card-desc">
              Make your agent familiar with the self-explanatory arc42 cli.
            </p>
            <div className="gs__snippet">
              <code>npx skills add doctoolchain/arc42-language</code>
            </div>
            <h3 className="gs__card-title">Talk architecture with your agent</h3>
            <div className="gs__snippet">
              <code>&quot;Make the architecture of this project machine readable arc42&quot;</code>
            </div>
          </div>
          <div className="gs__card">
            <div className="gs__card-label">AI agent</div>
            <h3 className="gs__card-title">Use the CLI</h3>
            <p className="gs__card-desc">
              Run the CLI directly. <code>--help</code> lists all commands.{" "}
              <code>arc42 guide migration</code> walks the full workflow for creating proper arc42
              docs. As agent, you'd want to ask questions to the developer you interact with, since
              not all architecture can be derived from the repo
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
