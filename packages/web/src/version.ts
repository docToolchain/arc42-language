import { useEffect, useState } from "react";

// ─── Version routing ──────────────────────────────────────────────────────────
//
// An earlier version of the architecture is selected by the URL query
// (`?version=<commit>`), not the hash: every in-page link is a hash link, so it
// keeps the query and navigates within the selected version unchanged.

const VERSION_CHANGE = "arc42:version";

/** The commit whose version is shown, or null for the current version. */
export function currentVersion(): string | null {
  return new URLSearchParams(window.location.search).get("version");
}

/** The link to a version: `?version=<commit>`, or the page itself for the current version. */
export function versionHref(commit: string | null, hash = ""): string {
  return `${commit ? `?version=${commit}` : window.location.pathname}${hash}`;
}

/** Open a version (null: the current one) without reloading the page. */
export function openVersion(commit: string | null, hash = ""): void {
  window.history.pushState(null, "", versionHref(commit, hash));
  window.dispatchEvent(new Event(VERSION_CHANGE));
}

/** The selected version, following links, openVersion and the browser's back button. */
export function useVersion(): string | null {
  const [version, setVersion] = useState(currentVersion);
  useEffect(() => {
    const update = () => setVersion(currentVersion());
    window.addEventListener("popstate", update);
    window.addEventListener(VERSION_CHANGE, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(VERSION_CHANGE, update);
    };
  }, []);
  return version;
}
