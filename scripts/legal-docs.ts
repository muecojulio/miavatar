#!/usr/bin/env node
/**
 * Genera `docs/POLITICA-DE-PRIVACIDAD.md` desde `src/lib/legal.ts`.
 *
 * Una sola fuente para la página de la app y el documento del repositorio, para
 * que no puedan decir cosas distintas con el tiempo:
 *
 *   npm run docs:legal
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIVACY_POLICY, PRIVACY_PROMISE, type PolicyBlock } from "../src/lib/legal.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = join(ROOT, "docs", "POLITICA-DE-PRIVACIDAD.md");

function renderBlock(block: PolicyBlock): string {
  if (block.kind === "p") return `${block.text}\n`;

  if (block.kind === "list") {
    return `${block.items.map((item) => `- ${item}`).join("\n")}\n`;
  }

  if (block.kind === "callout") {
    return `> ${block.tone === "warn" ? "**Atención.** " : "**Nota.** "}${block.title} ${block.text}\n`;
  }

  const header = `| ${block.headers.join(" | ")} |`;
  const divider = `| ${block.headers.map(() => "---").join(" | ")} |`;
  const rows = block.rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
  return `${block.caption ? `_${block.caption}_\n\n` : ""}${header}\n${divider}\n${rows}\n`;
}

const index = PRIVACY_POLICY.sections
  .map((section) => `- [${section.title}](#${section.id})`)
  .join("\n");

const body = PRIVACY_POLICY.sections
  .map(
    (section) =>
      `## <a id="${section.id}"></a>${section.title}\n\n${section.blocks
        .map(renderBlock)
        .join("\n")}`,
  )
  .join("\n---\n\n");

const markdown = `# ${PRIVACY_POLICY.title}

> **Versión ${PRIVACY_POLICY.version}** · actualizada el ${PRIVACY_POLICY.updated} · vigente desde el ${PRIVACY_POLICY.effective}.

${PRIVACY_POLICY.summary}

> ${PRIVACY_PROMISE}

Este documento se genera desde \`src/lib/legal.ts\` con \`npm run docs:legal\`: la
página de privacidad de la aplicación y este archivo muestran el mismo texto.

## Índice

${index}

${body}
`;

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, markdown);
console.log(`[legal] escrito ${TARGET.replace(`${ROOT}/`, "")} (${markdown.length} caracteres)`);
