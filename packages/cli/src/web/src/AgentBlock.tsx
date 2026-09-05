import React from "react";

interface AgentBlockProps {
  /** Raw source text to show verbatim */
  source: string;
  /** Optional language for syntax hinting (e.g. "arc42") */
  lang?: string;
}

export function AgentBlock({ source, lang = "arc42" }: AgentBlockProps) {
  return (
    <pre className="agent-block">
      <code className={`language-${lang}`}>{source}</code>
    </pre>
  );
}
