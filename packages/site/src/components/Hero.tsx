import { useState } from "react";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const installCmd = "npx @doctc/arc42 serve";

  const handleCopy = () => {
    void navigator.clipboard.writeText(installCmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="hero" aria-label="Introduction">
      <div className="container hero__inner">
        <p className="hero__eyebrow">Architecture · Documentation · Drift Detection</p>
        <h1 className="hero__headline">
          Architecture docs that
          <br />
          <em>stay correct.</em>
        </h1>
        <p className="hero__sub">Human-readable. Agent-writable. Machine-verifiable.</p>
        <div className="hero__install" role="group" aria-label="Install command">
          <span className="hero__install-prompt">$</span>
          <code>{installCmd}</code>
          <button
            className="hero__install-copy"
            onClick={handleCopy}
            aria-label={copied ? "Copied!" : "Copy install command"}
            title={copied ? "Copied!" : "Copy to clipboard"}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        <div className="hero__ctas">
          <a href="./docs/" className="btn btn--primary">
            View architecture docs →
          </a>
          <a href="./bookstore/" className="btn btn--outline">
            See bookstore example →
          </a>
        </div>
        <a
          href="#getting-started"
          className="hero__scroll-hint"
          aria-label="Scroll to getting started"
        >
          <ChevronDownIcon />
        </a>
      </div>
    </section>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
