// Local type augmentation for 'asciidoctor' package.
// asciidoctor's package.json exports map lacks a "types" condition, so
// moduleResolution: nodenext cannot find types automatically.
// This file provides the minimal types needed by AsciidocProseRenderer.
declare module "asciidoctor" {
  interface AsciidoctorDocument {
    convert(options?: Record<string, unknown>): Promise<string>;
  }
  export function load(
    input: string | string[] | Buffer,
    options?: Record<string, unknown>,
  ): Promise<AsciidoctorDocument>;
}
