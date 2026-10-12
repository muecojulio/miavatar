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
    const weather = await getWeatherForPlace({
      latitude: 40.4,
      longitude: -3.7,
      timezone: "Europe/Madrid",
    });
    assert.equal(requested[0]?.hostname, "api.open-meteo.com");
    assert.equal(requested[0]?.searchParams.get("temperature_unit"), "celsius");
    assert.equal(weather.temperatureC, 8.4);
    assert.equal(weather.rainProbabilityPct, 75);
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
