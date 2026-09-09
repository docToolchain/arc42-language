import { useMemo } from "react";
import { marked } from "marked";
import { readmeContent } from "virtual:readme";

export function ReadmeSection() {
  const html = useMemo(() => {
    // Remove the demo gif line — it won't resolve in the deployed context
    const cleaned = readmeContent.replace(/!\[.*?\]\(demo\/demo\.gif\)\n?/g, "");
    return marked.parse(cleaned) as string;
  }, []);

  return (
    <section className="section readme-section" aria-labelledby="readme-heading" id="readme">
      <div className="container">
        <h2 className="readme__title" id="readme-heading">
          Reference
        </h2>
        {/* eslint-disable-next-line react/no-danger */}
        <div className="readme__body prose" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </section>
  );
}
