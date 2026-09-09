/// <reference types="vite/client" />

declare module "virtual:verdicts" {
  export interface Verdict {
    slug: string;
    model: string;
    harness: string;
    agent: string;
    date: string;
    task: string;
    version: string;
    title: string;
    tldr: string;
  }
  export const verdicts: Verdict[];
}
