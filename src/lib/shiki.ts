import { createHighlighter, type Highlighter } from "shiki";

const THEMES = ["light-plus", "dark-plus"] as const;

const LANGS = [
  "tsx",
  "ts",
  "javascript",
  "jsx",
  "bash",
  "json",
  "graphql",
  "css",
  "html",
] as const;

type SupportedLang = (typeof LANGS)[number];

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [...THEMES],
      langs: [...LANGS],
    });
  }
  return highlighterPromise;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Guess the language from the snippet so the 130+ existing call sites that pass
// no explicit `language` still highlight with the right grammar. TS/TSX is the
// overwhelming majority, so it is the fallback.
export function detectLanguage(code: string, label?: string): SupportedLang {
  const trimmed = code.trim();

  // First meaningful line, skipping leading blanks and '#' comment lines
  // ('#' is the comment char for both GraphQL and shell snippets).
  const firstMeaningful =
    trimmed
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#")) ?? "";

  // Shell commands and raw HTTP requests.
  if (
    /^(\$|npm |npx |curl |cd |git |node |yarn |pnpm )/.test(firstMeaningful) ||
    /^(GET|POST|PUT|PATCH|DELETE) https?:\/\//.test(firstMeaningful)
  ) {
    return "bash";
  }

  // GraphQL operations.
  if (/^(query|mutation|fragment|subscription)\b/.test(firstMeaningful) && /\{/.test(trimmed)) {
    return "graphql";
  }

  // JSON payloads: starts with a brace/bracket and has no obvious code tokens.
  if (/^[{[]/.test(trimmed) && !/\b(function|const|let|var|import|=>)\b/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // Not strict JSON (e.g. trailing commas, comments) - fall through.
    }
  }

  const hint = label?.toLowerCase() ?? "";
  if (hint.includes("graphql")) return "graphql";
  if (hint.includes("json")) return "json";
  if (hint.includes("bash") || hint.includes("shell") || hint.includes("terminal")) return "bash";

  return "tsx";
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  const resolved = (LANGS as readonly string[]).includes(lang) ? lang : "tsx";
  try {
    const highlighter = await getHighlighter();
    return highlighter.codeToHtml(code, {
      lang: resolved,
      themes: { light: "light-plus", dark: "dark-plus" },
      defaultColor: false,
    });
  } catch {
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}
