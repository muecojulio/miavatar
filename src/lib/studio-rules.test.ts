import assert from "node:assert/strict";
import test from "node:test";

// Path2D is a browser global; the geometry under test only needs the calls to
// exist, not to paint anything.
class FakePath {
  ellipse() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  closePath() {}
  addPath() {}
}
(globalThis as unknown as { Path2D: unknown }).Path2D = FakePath;

const { bodyMetrics, mix } = await import("./draw-body.ts");
const { nailShapes } = await import("./draw-nails.ts");
const types = await import("./types.ts");

test("la pestaña de uñas solo existe para mujer y niña", () => {
  assert.equal(types.showsNails("mujer"), true);
  assert.equal(types.showsNails("nina"), true);
  assert.equal(types.showsNails("hombre"), false);
  assert.equal(types.showsNails("nino"), false);
  assert.equal(types.showsNails(null), false);
});

test("una prenda muy alta se coloca como look completo", () => {
  assert.equal(types.guessZone(600, 300), "superior");
  assert.equal(types.guessZone(400, 900), "completo");
  assert.equal(types.guessZone(0, 0), "superior");
});

test("peso y estatura se limitan al rango de cada tipo", () => {
  assert.deepEqual(types.clampMeasures("mujer", 120, 300), { heightCm: 140, weightKg: 160 });
  assert.deepEqual(types.clampMeasures("nino", 300, 5), { heightCm: 165, weightKg: 14 });
  assert.deepEqual(types.clampMeasures("hombre", 180, 80), { heightCm: 180, weightKg: 80 });
});

test("la figura cambia con la estatura y con el peso", () => {
  const alto = bodyMetrics("hombre", 195, 80);
  const bajo = bodyMetrics("hombre", 150, 80);
  assert.ok(alto.vertical > bajo.vertical);
  assert.ok(alto.ankleY > bajo.ankleY, "las piernas del alto llegan más abajo");
  assert.ok(alto.ankleY < 1120, "la figura cabe en el lienzo");

  const pesado = bodyMetrics("hombre", 175, 140);
  const ligero = bodyMetrics("hombre", 175, 55);
  assert.ok(pesado.girth > ligero.girth);
  assert.ok(pesado.shoulderHalf > ligero.shoulderHalf);

  const mujer = bodyMetrics("mujer", 168, 60);
  const hombre = bodyMetrics("hombre", 168, 60);
  assert.ok(mujer.hipHalf > mujer.shoulderHalf, "cadera femenina más ancha");
  assert.ok(hombre.shoulderHalf > hombre.hipHalf, "hombro masculino más ancho");
});

test("mix aclara y oscurece colores hex y rgb", () => {
  assert.equal(mix("#000000", 0.5), "rgb(128, 128, 128)");
  assert.equal(mix("rgb(200, 100, 50)", -1), "rgb(0, 0, 0)");
  assert.equal(mix("#c9956c", 0), "rgb(201, 149, 108)");
});

test("cada mano recibe cinco uñas y el acento va en el anular", () => {
  const hand = Array.from({ length: 21 }, (_, index) => ({ x: 0.2 + index * 0.02, y: 0.4 }));
  // Straight fingers pointing down: the five tips are 4, 8, 12, 16 and 20.
  for (let finger = 0; finger < 5; finger += 1) {
    const dip = finger * 4 + 3;
    const tip = finger * 4 + 4;
    hand[dip] = { x: 0.2 + finger * 0.05, y: 0.4 };
    hand[tip] = { x: 0.2 + finger * 0.05, y: 0.55 };
  }
  const shapes = nailShapes([hand], 1000, 1000);
  assert.equal(shapes.length, 5);
  assert.deepEqual(
    shapes.map((nail) => nail.finger),
    [0, 1, 2, 3, 4],
  );
  assert.ok(shapes.every((nail) => nail.size.w > 0 && nail.size.h > 0));
  const [thumb] = shapes;
  assert.equal(thumb?.finger, 3 - 3);
});

test("el tinte y el esmalte tienen catálogos con etiqueta y color", () => {
  assert.equal(types.dyeById("rubio").hex, "#d7b15a");
  assert.equal(types.dyeById("no-existe").id, "natural");
  assert.equal(types.nailById("rojo").label, "Rojo");
  assert.equal(types.eyeHex("azul"), "#3e6494");
  assert.equal(types.favoriteKindLabel("cabello"), "Peinados y tintes");
});
