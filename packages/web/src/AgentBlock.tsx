import React from "react";
import styles from "./AgentBlock.module.css";

interface AgentBlockProps {
  /** Raw source text to show verbatim */
  source: string;
  /** Optional language for syntax hinting (e.g. "arc42") */
  lang?: string;
}

export function AgentBlock({ source, lang = "arc42" }: AgentBlockProps) {
  return (
    <pre data-testid="agent-block" className={styles.agentBlock}>
      <code className={`language-${lang}`}>{source}</code>
    </pre>
  );
}
