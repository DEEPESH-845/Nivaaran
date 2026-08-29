import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The dark palette is declared twice — once for the system preference, once
 * for the manual toggle — because CSS cannot share a declaration body across
 * an at-rule boundary. Two copies drift. These tests are what stops them.
 *
 * They also catch the other half of the same mistake: adding a colour token
 * to @theme and forgetting to give it a dark value, which is how a single
 * hardcoded-light surface survives into a dark page.
 */

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Declarations inside the rule that starts at `selector`, as name → value. */
function declarations(selector: string): Record<string, string> {
  const at = css.indexOf(selector);
  expect(at, `selector not found: ${selector}`).toBeGreaterThan(-1);
  const open = css.indexOf("{", at + selector.length);
  let depth = 0;
  let close = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) {
      close = i;
      break;
    }
  }
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Record<string, string> = {};
  for (const line of body.split(";")) {
    const m = line.match(/(--[\w-]+)\s*:\s*([^;]+)/);
    if (m) out[m[1]] = m[2].trim().replace(/\s+/g, " ");
  }
  return out;
}

/** Tokens that are the same colour in both themes by design: the night act is
 *  a designed dark scene on the landing page, not a theme. */
const THEME_INDEPENDENT = /^--color-(night|signal|blocked-300|clear-300)/;

const systemDark = declarations(':root:not([data-theme="light"])');
const manualDark = declarations(':root[data-theme="dark"]');

describe("dark palette", () => {
  it("says exactly the same thing to the media query and to the toggle", () => {
    expect(Object.keys(manualDark).length).toBeGreaterThan(20);
    expect(manualDark).toEqual(systemDark);
  });

  it("gives every themeable colour token a dark value", () => {
    const themeBlock = declarations("@theme");
    const missing = Object.keys(themeBlock).filter(
      (k) =>
        k.startsWith("--color-") &&
        !THEME_INDEPENDENT.test(k) &&
        !(k in manualDark),
    );
    expect(missing, "colour tokens with no dark counterpart").toEqual([]);
  });

  it("re-pitches the shadows, which are invisible as light-mode greys", () => {
    for (const k of ["--shadow-card", "--shadow-lift", "--shadow-sheet"]) {
      expect(manualDark[k], `${k} has no dark value`).toBeDefined();
    }
  });

  it("hands native controls the matching color-scheme", () => {
    expect(css).toMatch(/:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light/);
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark/);
  });
});
