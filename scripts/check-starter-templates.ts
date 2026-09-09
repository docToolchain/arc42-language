import { CHAPTERS, filename } from "../packages/cli/src/chapters.ts";

if (CHAPTERS.length !== 12) {
  throw new Error(`Expected 12 chapter definitions, found ${CHAPTERS.length}.`);
}

const numbers = new Set<number>();
const files = new Set<string>();

for (const chapter of CHAPTERS) {
  const file = filename(chapter);
  if (chapter.number !== CHAPTERS.indexOf(chapter) + 1) {
    throw new Error("Chapter numbers must be the consecutive sequence 1 through 12.");
  }
  if (numbers.has(chapter.number)) throw new Error(`Duplicate chapter number: ${chapter.number}`);
  if (files.has(file)) throw new Error(`Duplicate chapter file: ${file}`);
  if (!chapter.template.endsWith("\n")) throw new Error(`${file} must end with a newline.`);
  numbers.add(chapter.number);
  files.add(file);
}

console.log(`Checked ${CHAPTERS.length} generated starter templates.`);
