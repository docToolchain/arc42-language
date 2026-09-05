import React, { useState } from "react";
import type { Element, Edge } from "./types";

// Chapter colour palette — maps BlockType to a CSS custom property
export const KIND_COLOR: Record<string, string> = {
  constraint: "var(--c-ch2)",
  actor: "var(--c-ch3)",
  "solution-strategy": "var(--c-ch4)",
  "building-block": "var(--c-ch5)",
  interface: "var(--c-ch5)",
  "runtime-scenario": "var(--c-ch6)",
  "deployment-node": "var(--c-ch7)",
  concept: "var(--c-ch8)",
  decision: "var(--c-ch9)",
  "quality-goal": "var(--c-ch10)",
  "quality-scenario": "var(--c-ch10)",
  risk: "var(--c-ch11)",
  "glossary-term": "var(--c-ch12)",
};

interface ElementCardProps {
  elementId: string;
  elementsMap: Map<string, Element>;
  elementDocMap: Map<string, string>;
  edges: Edge[];
  accentColor?: string;
  onDismiss?: () => void;
}

/** Build a hash link that navigates to the correct document and scrolls to the element anchor. */
function refHref(targetId: string, elementDocMap: Map<string, string>): string {
  const docFile = elementDocMap.get(targetId);
  if (docFile) {
    return `#${docFile}:el-${targetId}`;
  }
  // Fallback: same-page anchor (element is in the currently visible doc)
  return `#el-${targetId}`;
}

export function ElementCard({
  elementId,
  elementsMap,
  elementDocMap,
  edges,
  accentColor,
  onDismiss,
}: ElementCardProps) {
  const el = elementsMap.get(elementId);
  if (!el) {
    return (
      <div className="element-card element-card--missing">
        <span className="element-card__badge">unknown</span>
        <span className="element-card__id">{elementId}</span>
        <span className="element-card__note">element not found in workspace</span>
      </div>
    );
  }

  const outgoing = edges.filter((e) => e.from === el.id);
  const incoming = edges.filter((e) => e.to === el.id);
  const color = accentColor ?? KIND_COLOR[el.kind] ?? "var(--c-ch0)";
  const [showIncoming, setShowIncoming] = useState(false);

  return (
    <div
      className={`element-card${onDismiss ? " element-card--dismissible" : ""}`}
      id={`el-${el.id}`}
    >
      {onDismiss ? (
        <button
          data-testid="card-dismiss-stripe"
          className="element-card__dismiss-stripe"
          style={{ backgroundColor: color }}
          onClick={onDismiss}
          title="Show prose"
          aria-label="Collapse element card"
        />
      ) : (
        <div className="element-card__static-stripe" style={{ backgroundColor: color }} />
      )}
      <div className="element-card__body">
        <div className="element-card__header">
          <span className="element-card__badge" style={{ backgroundColor: color }}>
            {el.kind}
          </span>
          <code className="element-card__id">{el.id}</code>
          <span className="element-card__title">{el.title}</span>
        </div>
        <dl className="element-card__fields">{renderFields(el)}</dl>
        {(outgoing.length > 0 || incoming.length > 0) && (
          <div className="element-card__refs">
            {outgoing.length > 0 && (
              <div className="element-card__refs-group">
                <span className="element-card__refs-label">references</span>
                {outgoing.map((e) => (
                  <a
                    data-testid="element-ref-chip"
                    key={`${e.to}-${e.relation}`}
                    href={refHref(e.to, elementDocMap)}
                    className="element-card__ref-chip"
                  >
                    <span className="element-card__ref-rel">{e.relation}</span>
                    {e.to}
                  </a>
                ))}
              </div>
            )}
            {incoming.length > 0 && (
              <div className="element-card__refs-group">
                <button
                  className="element-card__refs-toggle"
                  onClick={() => setShowIncoming((v) => !v)}
                  aria-expanded={showIncoming}
                >
                  <span className="element-card__refs-label">
                    referenced by ({incoming.length})
                  </span>
                  <span className="element-card__refs-toggle-icon">{showIncoming ? "▾" : "▸"}</span>
                </button>
                {showIncoming &&
                  incoming.map((e) => (
                    <a
                      data-testid="element-ref-chip"
                      key={`${e.from}-${e.relation}`}
                      href={refHref(e.from, elementDocMap)}
                      className="element-card__ref-chip element-card__ref-chip--incoming"
                    >
                      <span className="element-card__ref-rel">{e.relation}</span>
                      {e.from}
                    </a>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderFields(el: Element): React.ReactNode {
  const fields: [string, string | undefined][] = [];

  switch (el.kind) {
    case "quality-goal":
      fields.push(["priority", el.priority]);
      if (el.scenario) fields.push(["scenario", el.scenario]);
      break;
    case "quality-scenario":
      fields.push(["quality", el.quality]);
      if (el.stimulus) fields.push(["stimulus", el.stimulus]);
      if (el.response) fields.push(["response", el.response]);
      if (el.metric) fields.push(["metric", el.metric]);
      break;
    case "actor":
      fields.push(["type", el.type]);
      if (el.description) fields.push(["description", el.description]);
      break;
    case "solution-strategy":
      if (el.addresses.length) fields.push(["addresses", el.addresses.join(", ")]);
      break;
    case "building-block":
      if (el.technology) fields.push(["technology", el.technology]);
      if (el.parent) fields.push(["parent", el.parent]);
      if (el.implements.length) fields.push(["implements", el.implements.join(", ")]);
      break;
    case "interface":
      fields.push(["between", el.between.join(" ↔ ")]);
      if (el.protocol) fields.push(["protocol", el.protocol]);
      break;
    case "runtime-scenario":
      if (el.involves.length) fields.push(["involves", el.involves.join(", ")]);
      if (el.trigger) fields.push(["trigger", el.trigger]);
      break;
    case "deployment-node":
      if (el.type) fields.push(["type", el.type]);
      if (el.parent) fields.push(["parent", el.parent]);
      if (el.hosts.length) fields.push(["hosts", el.hosts.join(", ")]);
      break;
    case "concept":
      if (el.category) fields.push(["category", el.category]);
      break;
    case "decision":
      fields.push(["status", el.status]);
      if (el.date) fields.push(["date", el.date]);
      if (el.addresses.length) fields.push(["addresses", el.addresses.join(", ")]);
      if (el.supersedes) fields.push(["supersedes", el.supersedes]);
      break;
    case "constraint":
      fields.push(["category", el.category]);
      if (el.source) fields.push(["source", el.source]);
      break;
    case "risk":
      fields.push(["severity", el.severity]);
      if (el.mitigation) fields.push(["mitigation", el.mitigation]);
      break;
    case "glossary-term":
      fields.push(["definition", el.definition]);
      break;
  }

  return fields.map(([key, val]) =>
    val ? (
      <div key={key} className="element-card__field">
        <dt>{key}</dt>
        <dd>{val}</dd>
      </div>
    ) : null,
  );
}
