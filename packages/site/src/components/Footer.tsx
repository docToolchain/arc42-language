export function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <div className="footer__badges">
          <a
            href="https://www.npmjs.com/package/@doctc/arc42"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="npm package"
          >
            <img
              src="https://img.shields.io/npm/v/@doctc/arc42?style=flat-square&label=npm&color=3b82f6"
              alt="npm version"
              height="20"
            />
          </a>
          <a
            href="https://github.com/doctoolchain/arc42-language/actions"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="CI status"
          >
            <img
              src="https://img.shields.io/github/actions/workflow/status/doctoolchain/arc42-language/ci.yml?style=flat-square&label=CI"
              alt="CI status"
              height="20"
            />
          </a>
        </div>
        <div className="footer__links">
          <a
            href="https://github.com/doctoolchain/arc42-language/blob/main/LICENSE"
            className="footer__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Apache 2.0
          </a>
          <span className="footer__sep" aria-hidden="true">
            ·
          </span>
          <a
            href="https://github.com/doctoolchain/arc42-language"
            className="footer__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
