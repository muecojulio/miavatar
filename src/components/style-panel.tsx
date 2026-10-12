import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  LoaderCircle,
  MapPin,
  Palette,
  Search,
  Snowflake,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";
import { Button, Choices } from "@/components/ui";
import { getColorAdvice, type ColorAdvice, type ColorMode } from "@/lib/color-advice";
import { extractColorPalette } from "@/lib/color-palette";
import { useStudio, type Garment } from "@/lib/store";
import {
  describeWeatherCode,
  getWeatherForPlace,
  outfitAdvice,
  searchPlaces,
  weatherIconKind,
  type GeoPlace,
  type WeatherSummary,
} from "@/lib/weather";

const COLOR_MODES: { id: ColorMode; label: string }[] = [
  { id: "complement", label: "Complementarios" },
  { id: "analogic", label: "Análogos" },
  { id: "triad", label: "Tríada" },
];

export function StylePanel() {
  return (
    <div className="panel space-y-5">
      <header>
        <h2 className="font-display text-3xl leading-tight">Asesoría de estilo</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Ideas gratuitas para coordinar tus prendas y vestirte según el clima. Tus fotos siguen en
          este dispositivo.
        </p>
      </header>
      <ColorAdvisor />
      <WeatherAdvisor />
      <p className="text-xs leading-relaxed text-muted">
        Servicios opcionales y sin clave: The Color API y Open-Meteo. Pueden tener límites o cambiar
        su disponibilidad. Open-Meteo ofrece su API pública gratuita para uso no comercial.
      </p>
    </div>
  );
}

function ColorAdvisor() {
  const garments = useStudio((state) => state.profile.garments);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [mode, setMode] = useState<ColorMode>("complement");
  const [result, setResult] = useState<ColorAdvice | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const activeGarment = garments.find((item) => item.id === selectedId) ?? garments[0] ?? null;
  const color = selectedHex && palette.includes(selectedHex) ? selectedHex : (palette[0] ?? null);

  useEffect(() => {
    if (!activeGarment) {
      setPalette([]);
      setSelectedHex(null);
      setResult(null);
      setError("");
      return;
    }

    let current = true;
    setAnalyzing(true);
    setPalette([]);
    setSelectedHex(null);
    setResult(null);
    setError("");
    void extractColorPalette(activeGarment.blob)
      .then((nextPalette) => {
        if (current) setPalette(nextPalette);
      })
      .catch(() => {
        if (current) setError("No pude leer los colores de esa foto. Prueba con otra prenda.");
      })
      .finally(() => {
        if (current) setAnalyzing(false);
      });

    return () => {
      current = false;
    };
  }, [activeGarment]);

  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  function cancelColorRequest() {
    request.current?.abort();
    request.current = null;
    setPending(false);
  }

  async function generateIdeas() {
    if (!color) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 12_000);
    setPending(true);
    setError("");
    setResult(null);
    try {
      const advice = await getColorAdvice(color, mode, controller.signal);
      if (!controller.signal.aborted) setResult(advice);
    } catch {
      if (request.current === controller) {
        if (timedOut) {
          setError("La consulta tardó demasiado. Prueba otra vez cuando tengas conexión.");
        } else if (!controller.signal.aborted) {
          setError("No se pudo conectar con The Color API. Puedes probar de nuevo más tarde.");
        }
      }
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setPending(false);
      }
    }
  }

  return (
    <section className="space-y-4 rounded-3xl bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
          <Palette className="size-5" />
        </span>
        <div>
          <h3 className="font-display text-2xl leading-tight">Combina tus colores</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            La paleta se calcula aquí con tus fotos. Al pedir ideas, solo se comparte el código de
            color, nunca la imagen.
          </p>
        </div>
      </div>

      {garments.length === 0 ? (
        <p className="rounded-2xl bg-bg/60 p-4 text-sm leading-relaxed text-muted">
          Sube una prenda en la pestaña Prendas para detectar sus colores y ver combinaciones.
        </p>
      ) : (
        <>
          {garments.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {garments.map((garment, index) => (
                <GarmentChoice
                  key={garment.id}
                  garment={garment}
                  label={`Prenda ${index + 1}`}
                  active={garment.id === activeGarment?.id}
                  onPick={() => {
                    cancelColorRequest();
                    setSelectedId(garment.id);
                    setSelectedHex(null);
                    setResult(null);
                    setError("");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-bg/60 p-3">
              <img src={garments[0].url} alt="" className="size-14 rounded-xl object-cover" />
              <p className="text-sm">Paleta de tu prenda</p>
            </div>
          )}

          {analyzing ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin" /> Analizando colores en este
              dispositivo…
            </p>
          ) : null}

          {palette.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">Elige un color para encontrar armonías</p>
              <div className="flex flex-wrap gap-2">
                {palette.map((shade, index) => (
                  <button
                    key={`${shade}-${index}`}
                    type="button"
                    aria-label={`Usar color ${index + 1}, ${shade}`}
                    aria-pressed={color === shade}
                    onClick={() => {
                      cancelColorRequest();
                      setSelectedHex(shade);
                      setResult(null);
                      setError("");
                    }}
                    className={`tap size-10 rounded-full outline outline-2 outline-offset-2 ${
                      color === shade ? "outline-accent" : "outline-fg/20"
                    }`}
                    style={{ backgroundColor: shade }}
                  />
                ))}
              </div>
              {color ? <p className="font-mono text-xs text-muted">{color}</p> : null}
            </div>
          ) : null}

          <Choices
            options={COLOR_MODES}
            value={mode}
            onChange={(nextMode) => {
              cancelColorRequest();
              setMode(nextMode);
              setResult(null);
              setError("");
            }}
          />
          <Button disabled={!color || analyzing || pending} onClick={() => void generateIdeas()}>
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Ver combinaciones
          </Button>
        </>
      )}

      {error ? (
        <p role="status" className="text-sm text-accent">
          {error}
        </p>
      ) : null}
      {result && color ? <ColorResults color={color} result={result} /> : null}
      <p className="text-xs text-muted">
        Ideas de armonía de color de{" "}
        <a
          className="underline underline-offset-2"
          href="https://www.thecolorapi.com/"
          target="_blank"
          rel="noreferrer"
        >
          The Color API
        </a>
        .
      </p>
    </section>
  );
}

function GarmentChoice({
  garment,
  label,
  active,
  onPick,
}: {
  garment: Garment;
  label: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPick}
      className={`tap flex min-w-28 shrink-0 items-center gap-2 rounded-2xl px-2 py-2 text-left text-xs outline outline-1 ${
        active ? "bg-bg text-fg outline-accent" : "bg-bg/40 text-muted outline-fg/10"
      }`}
    >
      <img src={garment.url} alt="" className="size-10 rounded-lg object-cover" />
      {label}
    </button>
  );
}

function ColorResults({ color, result }: { color: string; result: ColorAdvice }) {
  const shades = result.colors.filter((shade) => shade.hex !== color.toUpperCase());
  return (
    <div className="space-y-3 rounded-2xl bg-bg/60 p-4">
      <p className="text-sm">
        <span className="font-medium">{result.baseName}</span>
        <span className="ml-2 font-mono text-xs text-muted">{color}</span>
      </p>
      <ul className="grid grid-cols-2 gap-2">
        {shades.map((shade, index) => (
          <li
            key={`${shade.hex}-${index}`}
            className="flex items-center gap-2 rounded-xl bg-surface p-2"
          >
            <span
              aria-hidden="true"
              className="size-8 shrink-0 rounded-full outline outline-1 outline-fg/10"
              style={{ backgroundColor: shade.hex }}
            />
            <span className="min-w-0">
              <span className="block truncate text-xs">{shade.name}</span>
              <span className="font-mono text-[10px] text-muted">{shade.hex}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WeatherAdvisor() {
  const [city, setCity] = useState("");
  const [places, setPlaces] = useState<GeoPlace[]>([]);
  const [activePlace, setActivePlace] = useState<GeoPlace | null>(null);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState("");
  const searchRequest = useRef<AbortController | null>(null);
  const weatherRequest = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      searchRequest.current?.abort();
      weatherRequest.current?.abort();
      searchRequest.current = null;
      weatherRequest.current = null;
    },
    [],
  );

  async function searchCity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (city.trim().length < 2) {
      setError("Escribe al menos dos letras del nombre de una ciudad.");
      return;
    }
    searchRequest.current?.abort();
    weatherRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setSearching(true);
    setPlaces([]);
    setActivePlace(null);
    setWeather(null);
    setError("");
    try {
      const matches = await searchPlaces(city, controller.signal);
      if (controller.signal.aborted) return;
      setPlaces(matches);
      if (matches.length === 0) setError("No encontré esa ciudad. Prueba con otro nombre.");
    } catch {
      if (searchRequest.current === controller) {
        if (controller.signal.aborted) {
          setError("La búsqueda tardó demasiado. Prueba otra vez cuando tengas conexión.");
        } else {
          setError("No se pudo buscar la ciudad. Revisa tu conexión e inténtalo de nuevo.");
        }
      }
    } finally {
      window.clearTimeout(timeout);
      if (searchRequest.current === controller) {
        searchRequest.current = null;
        setSearching(false);
      }
    }
  }

  async function choosePlace(place: GeoPlace) {
    weatherRequest.current?.abort();
    const controller = new AbortController();
    weatherRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setActivePlace(place);
    setPlaces([]);
    setWeather(null);
    setLoadingWeather(true);
    setError("");
    try {
      const forecast = await getWeatherForPlace(place, controller.signal);
      if (!controller.signal.aborted) setWeather(forecast);
    } catch {
      if (weatherRequest.current === controller) {
        if (controller.signal.aborted) {
          setError("La consulta del clima tardó demasiado. Prueba otra vez.");
        } else {
          setError("No se pudo consultar el pronóstico de esta ciudad.");
        }
      }
    } finally {
      window.clearTimeout(timeout);
      if (weatherRequest.current === controller) {
        weatherRequest.current = null;
        setLoadingWeather(false);
      }
    }
  }

  return (
    <section className="space-y-4 rounded-3xl bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
          <CloudSun className="size-5" />
        </span>
        <div>
          <h3 className="font-display text-2xl leading-tight">Vístete según el clima</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Busca una ciudad para ver las condiciones de hoy y una sugerencia de capas.
          </p>
        </div>
      </div>

      <form className="space-y-2" onSubmit={(event) => void searchCity(event)}>
        <label htmlFor="style-city" className="text-sm text-muted">
          Ciudad o localidad
        </label>
        <div className="flex gap-2">
          <input
            id="style-city"
            type="search"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Ej. Madrid, España"
            autoComplete="off"
            className="min-h-11 min-w-0 flex-1 rounded-full bg-bg px-4 text-sm text-fg placeholder:text-muted/70 outline outline-1 outline-fg/10"
          />
          <Button type="submit" disabled={searching || city.trim().length < 2}>
            {searching ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Buscar
          </Button>
        </div>
      </form>

      {places.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted">Elige la ciudad correcta:</p>
          <ul className="space-y-2">
            {places.map((place, index) => (
              <li key={`${place.id}-${place.latitude}-${place.longitude}-${index}`}>
                <button
                  type="button"
                  onClick={() => void choosePlace(place)}
                  className="tap flex min-h-11 w-full items-center gap-2 rounded-xl bg-bg/60 px-3 py-2 text-left text-sm"
                >
                  <MapPin className="size-4 shrink-0 text-accent" />
                  <span className="min-w-0 truncate">
                    {place.name}
                    {place.admin1 && place.admin1 !== place.name ? ` · ${place.admin1}` : ""}
                    {place.country ? ` · ${place.country}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loadingWeather ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" /> Consultando el pronóstico…
        </p>
      ) : null}
      {error ? (
        <p role="status" className="text-sm text-accent">
          {error}
        </p>
      ) : null}
      {activePlace && weather ? <WeatherResult place={activePlace} weather={weather} /> : null}

      <p className="text-xs leading-relaxed text-muted">
        El buscador comparte el nombre de la ciudad y, al elegirla, sus coordenadas con Open-Meteo;
        no se envían fotos ni se solicita tu ubicación precisa.
      </p>
      <p className="text-xs text-muted">
        Datos meteorológicos:{" "}
        <a
          className="underline underline-offset-2"
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo
        </a>
        {" · "}
        <a
          className="underline underline-offset-2"
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY 4.0
        </a>
        .
      </p>
    </section>
  );
}

function WeatherResult({ place, weather }: { place: GeoPlace; weather: WeatherSummary }) {
  const code = weatherIconKind(weather.weatherCode);
  const WeatherIcon =
    code === "sun"
      ? CloudSun
      : code === "rain"
        ? CloudRain
        : code === "snow"
          ? Snowflake
          : code === "storm"
            ? CloudLightning
            : Cloud;
  const suggestions = outfitAdvice(weather);
  return (
    <div className="space-y-4 rounded-2xl bg-bg/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted">
            {place.name}
            {place.country ? ` · ${place.country}` : ""}
          </p>
          <p className="mt-1 text-sm">{describeWeatherCode(weather.weatherCode)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WeatherIcon className="size-7 text-accent" />
          <span className="font-display text-3xl">{Math.round(weather.temperatureC)}°</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted">
        <div className="flex items-center gap-2 rounded-xl bg-surface p-3">
          <Thermometer className="size-4 shrink-0 text-accent" />
          <span>
            Sensación {Math.round(weather.feelsLikeC)}°
            {weather.highC !== null && weather.lowC !== null
              ? ` · ${Math.round(weather.lowC)}° / ${Math.round(weather.highC)}°`
              : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-surface p-3">
          <Wind className="size-4 shrink-0 text-accent" />
          <span>
            {Math.round(weather.windKmh)} km/h
            {weather.rainProbabilityPct !== null
              ? ` · lluvia ${Math.round(weather.rainProbabilityPct)}%`
              : ""}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-accent" /> Idea para vestirte
        </p>
        <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>• {suggestion}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
