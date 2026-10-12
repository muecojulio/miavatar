import assert from "node:assert/strict";
import test from "node:test";
import { getColorAdvice } from "./color-advice.ts";
import { describeWeatherCode, getWeatherForPlace, outfitAdvice, searchPlaces } from "./weather.ts";

const originalFetch = globalThis.fetch;

test("city lookup uses the public Open-Meteo geocoder without credentials", async () => {
  const requested: URL[] = [];
  globalThis.fetch = (async (input) => {
    requested.push(new URL(String(input)));
    return new Response(
      JSON.stringify({
        results: [
          {
            id: 5,
            name: "Madrid",
            latitude: 40.4,
            longitude: -3.7,
            country: "España",
            admin1: "Madrid",
            timezone: "Europe/Madrid",
          },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const matches = await searchPlaces("Madrid");
    assert.equal(requested[0]?.hostname, "geocoding-api.open-meteo.com");
    assert.equal(requested[0]?.searchParams.get("name"), "Madrid");
    assert.equal(requested[0]?.searchParams.get("language"), "es");
    assert.equal(requested[0]?.searchParams.has("apikey"), false);
    assert.equal(matches[0]?.name, "Madrid");
    assert.equal(matches[0]?.latitude, 40.4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("weather forecast is parsed into metric conditions and outfit hints", async () => {
  const requested: URL[] = [];
  globalThis.fetch = (async (input) => {
    requested.push(new URL(String(input)));
    return new Response(
      JSON.stringify({
        current: {
          temperature_2m: 8.4,
          apparent_temperature: 5.2,
          precipitation: 0.3,
          weather_code: 61,
          wind_speed_10m: 38,
        },
        daily: {
          temperature_2m_max: [12.1],
          temperature_2m_min: [3.2],
          precipitation_probability_max: [75],
        },
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const { summary: weather, stale } = await getWeatherForPlace({
      latitude: 40.4,
      longitude: -3.7,
      timezone: "Europe/Madrid",
    });
    assert.equal(requested[0]?.hostname, "api.open-meteo.com");
    assert.equal(requested[0]?.searchParams.get("temperature_unit"), "celsius");
    assert.equal(weather.temperatureC, 8.4);
    assert.equal(weather.rainProbabilityPct, 75);
    assert.equal(stale, false);
    assert.equal(describeWeatherCode(weather.weatherCode), "Lluvia");
    assert.match(outfitAdvice(weather).join(" "), /chaqueta o suéter/);
    assert.match(outfitAdvice(weather).join(" "), /paraguas/);
    assert.match(outfitAdvice(weather).join(" "), /viento fuerte/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("color advice requests the keyless identification and harmony endpoints", async () => {
  const requested: URL[] = [];
  globalThis.fetch = (async (input) => {
    const url = new URL(String(input));
    requested.push(url);
    if (url.pathname === "/id") {
      return new Response(
        JSON.stringify({ hex: { value: "#12AB34" }, name: { value: "Spring Green" } }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        colors: [
          { hex: { value: "#12AB34" }, name: { value: "Spring Green" } },
          { hex: { value: "#AB1234" }, name: { value: "Crimson" } },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const advice = await getColorAdvice("#12AB34", "triad");
    assert.equal(requested.length, 2);
    assert.ok(requested.every((url) => url.hostname === "www.thecolorapi.com"));
    assert.ok(requested.every((url) => !url.searchParams.has("key")));
    assert.ok(
      requested.some(
        (url) => url.pathname === "/scheme" && url.searchParams.get("mode") === "triad",
      ),
    );
    assert.equal(advice.baseName, "Spring Green");
    assert.equal(advice.colors[1]?.hex, "#AB1234");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("el pronóstico se cachea y sirve el último dato si la red falla", async () => {
  // Doble del `localStorage` del navegador: la caché usa memoria + almacenamiento.
  const stored = new Map<string, string>();
  const localStorageDouble = {
    get length() {
      return stored.size;
    },
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => void stored.set(key, value),
    removeItem: (key: string) => void stored.delete(key),
    key: (index: number) => [...stored.keys()][index] ?? null,
    clear: () => stored.clear(),
  } as Storage;
  const originalWindow = (globalThis as { window?: unknown }).window;
  const originalNow = Date.now;
  let now = 1_700_000_000_000;
  Date.now = () => now;
  (globalThis as { window?: unknown }).window = { localStorage: localStorageDouble };

  const place = { latitude: 11.111, longitude: 22.222, timezone: "UTC" };
  const payload = {
    current: {
      temperature_2m: 21.5,
      apparent_temperature: 20.1,
      precipitation: 0,
      weather_code: 1,
      wind_speed_10m: 6,
    },
    daily: { temperature_2m_max: [24], temperature_2m_min: [15], precipitation_probability_max: [5] },
  };

  try {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify(payload), { status: 200 });
    }) as typeof fetch;

    const first = await getWeatherForPlace(place);
    assert.equal(first.summary.temperatureC, 21.5);
    assert.equal(first.stale, false);
    assert.equal(calls, 1);

    // Dentro de la ventana de 15 minutos no se vuelve a consultar la red.
    const second = await getWeatherForPlace(place);
    assert.equal(second.stale, false);
    assert.equal(calls, 1);

    // Pasada la ventana, y sin red, se devuelve el último pronóstico guardado.
    now += 16 * 60 * 1000;
    globalThis.fetch = (async () => {
      throw new Error("sin red");
    }) as typeof fetch;
    const offline = await getWeatherForPlace(place);
    assert.equal(offline.stale, true);
    assert.equal(offline.summary.temperatureC, 21.5);
  } finally {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

test("una misma consulta de color no se repite: la caché responde", async () => {
  let calls = 0;
  globalThis.fetch = (async (input) => {
    calls += 1;
    const url = new URL(String(input));
    const hex = url.pathname === "/id" ? "#00CC88" : "#00CC88";
    return new Response(
      JSON.stringify(
        url.pathname === "/id"
          ? { hex: { value: hex }, name: { value: "Verde" } }
          : { colors: [{ hex: { value: hex }, name: { value: "Verde" } }] },
      ),
      { status: 200 },
    );
  }) as typeof fetch;

  try {
    const first = await getColorAdvice("#00CC88", "analogic");
    const second = await getColorAdvice("#00cc88", "analogic");
    assert.equal(calls, 2, "una sola consulta por par color/modo");
    assert.deepEqual(second, first);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
