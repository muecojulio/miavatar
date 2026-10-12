import assert from "node:assert/strict";
import test from "node:test";
import { normalizeText } from "./cache.ts";

/**
 * Reglas de interacción comprobables sin navegador.
 *
 * El bloqueo de eje y la exclusión de controles son las dos reglas que hacen
 * que un deslizamiento no cancele el scroll vertical ni active nada por
 * accidente; aquí se comprueban con dobles mínimos del DOM.
 */

type FakeElement = {
  closest: (selector: string) => unknown;
  matches: (selector: string) => boolean;
};

class FakeNode {
  closest(): unknown {
    return null;
  }
  matches(): boolean {
    return false;
  }
}

(globalThis as unknown as { Element: unknown }).Element = FakeNode;

const { isInteractiveTarget, INTERACTIVE_SELECTOR, NESTED_SWIPE_SELECTOR } = await import("./use-gesture.ts");

test("un gesto que nace sobre un control nunca mueve la tarjeta", () => {
  const cases: [string, boolean][] = [
    ["button", true],
    ["a[href]", true],
    ["input", true],
    ["select", true],
    ["textarea", true],
    ["label", true],
    ["[role='button']", true],
    ["[role='tab']", true],
    ["[role='switch']", true],
    ["[role='slider']", true],
    ["[role='combobox']", true],
    ["[data-no-swipe]", true],
    ["div", false],
    ["article", false],
    ["span", false],
  ];

  for (const [selector, interactive] of cases) {
    const element = Object.assign(new FakeNode(), {
      closest: (query: string) => (query === INTERACTIVE_SELECTOR && interactive ? {} : null),
    }) as unknown as FakeElement;

    assert.equal(isInteractiveTarget(element as unknown as Element), interactive, selector);
  }

  assert.equal(isInteractiveTarget(null), false);
});

test("la lista de controles excluidos cubre los campos y selectores", () => {
  for (const token of [
    "button",
    "a[href]",
    "input",
    "select",
    "textarea",
    "[role='combobox']",
    "[role='slider']",
    "[role='switch']",
    "[role='option']",
    "[data-no-swipe]",
  ]) {
    assert.ok(INTERACTIVE_SELECTOR.includes(token), token);
  }
});

test("buscar ignora mayúsculas y acentos (para el selector con búsqueda)", () => {
  assert.equal(normalizeText("Ciudad de México"), "ciudad de mexico");
  assert.equal(normalizeText("  BOGOTÁ  "), "bogota");
  assert.equal(normalizeText("Málaga").includes("malaga"), true);
});

test("la caché con caducidad agrupa peticiones idénticas y respeta el TTL", async () => {
  const { createTtlCache } = await import("./cache.ts");
  const cache = createTtlCache<number>("prueba", 1000);
  let calls = 0;
  const load = () =>
    cache.load("clave", async () => {
      calls += 1;
      return calls;
    });

  const [a, b] = await Promise.all([load(), load()]);
  assert.equal(calls, 1, "una sola llamada para dos peticiones simultáneas");
  assert.equal(a, 1);
  assert.equal(b, 1);

  const third = await load();
  assert.equal(calls, 1, "la memoria sirve el valor vigente sin volver a llamar");
  assert.equal(third, 1);
  assert.equal(cache.peekStale("clave"), 1);
  assert.equal(cache.peek("otra"), null);
});

test("los avisos guardados se pueden borrar por completo", async () => {
  const { createTtlCache, clearAllCaches } = await import("./cache.ts");
  const cache = createTtlCache<string>("otra", 60_000);
  cache.put("x", "y");
  assert.equal(cache.peek("x"), "y");
  clearAllCaches();
  assert.equal(cache.peek("x"), null);
});

test("los carriles y las filas deslizables se anuncian para no robar el gesto", async () => {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const root = new URL("../../", import.meta.url).pathname;

  // El selector del armazón tiene que cubrir las dos marcas.
  assert.ok(NESTED_SWIPE_SELECTOR.includes("[data-rail]"), NESTED_SWIPE_SELECTOR);
  assert.ok(NESTED_SWIPE_SELECTOR.includes("[data-swipe-surface]"), NESTED_SWIPE_SELECTOR);

  const sources = {
    "components/rail.tsx": "data-rail",
    "components/favoritos-panel.tsx": "data-rail",
    "components/swipe-row.tsx": "data-swipe-surface",
  };
  for (const [file, marker] of Object.entries(sources)) {
    const text = readFileSync(join(root, "src", file), "utf8");
    assert.ok(text.includes(marker), `${file} debe llevar ${marker}`);
  }

  const shell = readFileSync(join(root, "src/components/app-shell.tsx"), "utf8");
  assert.ok(shell.includes("ignoreFrom: NESTED_SWIPE_SELECTOR"), "el armazón declara qué ignorar");
});
