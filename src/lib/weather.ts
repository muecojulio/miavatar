export type GeoPlace = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1: string;
  timezone: string;
};

export type WeatherSummary = {
  temperatureC: number;
  feelsLikeC: number;
  highC: number | null;
  lowC: number | null;
  rainProbabilityPct: number | null;
  precipitationMm: number;
  windKmh: number;
  weatherCode: number;
};

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

async function readJson<T>(url: URL, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new Error("No se pudo consultar el servicio meteorológico.");
  return (await response.json()) as T;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstNumber(value: unknown): number | null {
  return Array.isArray(value) ? finite(value[0]) : null;
}

/** Searches a city name; no account, API key, or browser location permission is needed. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoPlace[]> {
  const name = query.trim();
  if (name.length < 2) return [];

  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({
    name,
    count: "5",
    language: "es",
    format: "json",
  }).toString();

  const payload = await readJson<{
    results?: Array<{
      id?: number;
      name?: string;
      latitude?: number;
      longitude?: number;
      country?: string;
      admin1?: string;
      timezone?: string;
    }>;
  }>(url, signal);

  return (payload.results ?? [])
    .filter(
      (place) =>
        typeof place.name === "string" &&
        Number.isFinite(place.latitude) &&
        Number.isFinite(place.longitude),
    )
    .slice(0, 5)
    .map((place) => ({
      id: Number.isFinite(place.id) ? (place.id as number) : 0,
      name: place.name as string,
      latitude: place.latitude as number,
      longitude: place.longitude as number,
      country: typeof place.country === "string" ? place.country : "",
      admin1: typeof place.admin1 === "string" ? place.admin1 : "",
      timezone: typeof place.timezone === "string" ? place.timezone : "auto",
    }));
}

/** Retrieves today's current conditions and daily outlook for a chosen place. */
export async function getWeatherForPlace(
  place: Pick<GeoPlace, "latitude" | "longitude" | "timezone">,
  signal?: AbortSignal,
): Promise<WeatherSummary> {
  const url = new URL(FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: place.timezone || "auto",
    forecast_days: "1",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  }).toString();

  const payload = await readJson<{
    current?: {
      temperature_2m?: unknown;
      apparent_temperature?: unknown;
      precipitation?: unknown;
      weather_code?: unknown;
      wind_speed_10m?: unknown;
    };
    daily?: {
      temperature_2m_max?: unknown;
      temperature_2m_min?: unknown;
      precipitation_probability_max?: unknown;
    };
  }>(url, signal);

  const temperatureC = finite(payload.current?.temperature_2m);
  const weatherCode = finite(payload.current?.weather_code);
  if (temperatureC === null || weatherCode === null) {
    throw new Error("El pronóstico no devolvió condiciones actuales para esta ciudad.");
  }

  return {
    temperatureC,
    feelsLikeC: finite(payload.current?.apparent_temperature) ?? temperatureC,
    highC: firstNumber(payload.daily?.temperature_2m_max),
    lowC: firstNumber(payload.daily?.temperature_2m_min),
    rainProbabilityPct: firstNumber(payload.daily?.precipitation_probability_max),
    precipitationMm: finite(payload.current?.precipitation) ?? 0,
    windKmh: finite(payload.current?.wind_speed_10m) ?? 0,
    weatherCode,
  };
}

export function describeWeatherCode(code: number): string {
  if (code === 0) return "Despejado";
  if (code === 1) return "Mayormente despejado";
  if (code === 2) return "Algo nublado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Niebla";
  if ([51, 53, 55, 56, 57].includes(code)) return "Llovizna";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Lluvia";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Nieve";
  if ([95, 96, 99].includes(code)) return "Tormenta";
  return "Condiciones variables";
}

export function weatherIconKind(code: number): "sun" | "cloud" | "rain" | "snow" | "storm" {
  if (code === 0 || code === 1) return "sun";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "cloud";
}

export function outfitAdvice(weather: WeatherSummary): string[] {
  const temperature = weather.feelsLikeC;
  const advice =
    temperature < 5
      ? "Hace frío: abrigo cálido y varias capas."
      : temperature < 12
        ? "Fresco: chaqueta o suéter sobre una capa ligera."
        : temperature < 19
          ? "Templado: una capa ligera que puedas quitarte."
          : temperature >= 29
            ? "Calor: prendas frescas, ligeras y transpirables."
            : temperature >= 24
              ? "Agradable: ropa ligera; añade una capa fina para la tarde."
              : "Clima suave: una combinación cómoda de capas ligeras.";

  const suggestions = [advice];
  if ((weather.rainProbabilityPct ?? 0) >= 45 || weather.precipitationMm >= 0.2) {
    suggestions.push("Hay posibilidad de lluvia: lleva paraguas o una capa impermeable.");
  }
  if (weather.windKmh >= 35) {
    suggestions.push("Viento fuerte: una chaqueta cerrada te resultará más cómoda.");
  }
  if (
    weather.highC !== null &&
    weather.lowC !== null &&
    weather.highC - weather.lowC >= 10 &&
    suggestions.length === 1
  ) {
    suggestions.push("La temperatura variará bastante: las capas fáciles de quitar ayudan.");
  }
  return suggestions;
}
