import { useEffect, useMemo, useRef, useState } from "react";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Copy,
  LoaderCircle,
  MapPin,
  Palette,
  Snowflake,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import { Combobox, type ComboOption } from "@/components/combobox";
import { Rail } from "@/components/rail";
import { Button, Choices, Note, type ActionState } from "@/components/ui";
import { cachedPalette } from "@/lib/analysis-cache";
import { normalizeText } from "@/lib/cache";
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

/** Ciudades de partida para no empezar con la lista vacía. */
const POPULAR: GeoPlace[] = [
  { id: 1, name: "Madrid", country: "España", admin1: "Madrid", latitude: 40.4, longitude: -3.7, timezone: "Europe/Madrid" },
  { id: 2, name: "Ciudad de México", country: "México", admin1: "CDMX", latitude: 19.43, longitude: -99.13, timezone: "America/Mexico_City" },
  { id: 3, name: "Guadalajara", country: "México", admin1: "Jalisco", latitude: 20.67, longitude: -103.35, timezone: "America/Mexico_City" },
  { id: 4, name: "Monterrey", country: "México", admin1: "Nuevo León", latitude: 25.67, longitude: -100.31, timezone: "America/Monterrey" },
  { id: 5, name: "Bogotá", country: "Colombia", admin1: "Bogotá", latitude: 4.71, longitude: -74.07, timezone: "America/Bogota" },
  { id: 6, name: "Buenos Aires", country: "Argentina", admin1: "CABA", latitude: -34.6, longitude: -58.38, timezone: "America/Argentina/Buenos_Aires" },
  { id: 7, name: "Lima", country: "Perú", admin1: "Lima", latitude: -12.05, longitude: -77.04, timezone: "America/Lima" },
  { id: 8, name: "Santiago", country: "Chile", admin1: "Metropolitana", latitude: -33.46, longitude: -70.65, timezone: "America/Santiago" },
];

export function StylePanel() {
  return (
    <div className="space-y-5">
      <header className="stagger" style={{ ["--i" as string]: 0 }}>
        <h2 className="font-display text-3xl leading-tight">Asesoría de estilo</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Ideas gratuitas para coordinar tus prendas y vestirte según el clima. Tus fotos siguen en
          este dispositivo.
        </p>
      </header>
      <div className="stagger" style={{ ["--i" as string]: 1 }}>
        <ColorAdvisor />
      </div>
      <div className="stagger" style={{ ["--i" as string]: 2 }}>
        <WeatherAdvisor />
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Servicios opcionales y sin clave: The Color API y Open-Meteo. Pueden tener límites o cambiar
        su disponibilidad. Open-Meteo ofrece su API pública gratuita para uso no comercial.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ Color */

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
  const [status, setStatus] = useState<ActionState>("idle");
  const request = useRef<AbortController | null>(null);
  const activeGarment = garments.find((item) => item.id === selectedId) ?? garments[0] ?? null;
  const color = selectedHex && palette.includes(selectedHex) ? selectedHex : (palette[0] ?? null);

  useEffect(() => {
    if (!activeGarment) {
      setPalette([]);
      setSelectedHex(null);
      setResult(null);
      setError("");
      setStatus("idle");
      return;
    }

    let current = true;
    setAnalyzing(true);
    setPalette([]);
    setSelectedHex(null);
    setResult(null);
    setError("");
    setStatus("idle");
    void cachedPalette(activeGarment.id, () => extractColorPalette(activeGarment.blob))
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

  function reset() {
    request.current?.abort();
    request.current = null;
    setPending(false);
    setStatus("idle");
    setResult(null);
    setError("");
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
    setStatus("loading");
    setError("");
    setResult(null);
    try {
      const advice = await getColorAdvice(color, mode, controller.signal);
      if (!controller.signal.aborted) {
        setResult(advice);
        setStatus("success");
      }
    } catch {
      if (request.current === controller) {
        setStatus("error");
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
    <section className="card space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
          <Palette className="size-5" aria-hidden="true" />
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
        <p className="rounded-2xl border border-dashed border-fg/15 p-4 text-sm leading-relaxed text-muted">
          Sube una prenda en la pestaña Prendas para detectar sus colores y ver combinaciones.
        </p>
      ) : (
        <>
          {garments.length > 1 ? (
            <Rail
              label="Prendas disponibles para analizar colores"
              activeKey={activeGarment?.id ?? null}
              fadeColor="var(--color-surface)"
            >
              {garments.map((garment, index) => (
                <GarmentChoice
                  key={garment.id}
                  garment={garment}
                  label={`Prenda ${index + 1}`}
                  active={garment.id === activeGarment?.id}
                  onPick={() => {
                    reset();
                    setSelectedId(garment.id);
                    setSelectedHex(null);
                  }}
                />
              ))}
            </Rail>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-bg/60 p-3">
              <img
                src={garments[0]!.url}
                alt=""
                className="size-14 rounded-xl object-cover"
                loading="lazy"
              />
              <p className="text-sm">Paleta de tu prenda</p>
            </div>
          )}

          {analyzing ? (
            <p className="flex items-center gap-2 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Analizando colores en este dispositivo…
            </p>
          ) : null}

          {palette.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">Elige un color para encontrar armonías</p>
              <Rail label="Colores detectados en la prenda" activeKey={color} fadeColor="var(--color-surface)">
                {palette.map((shade, index) => (
                  <button
                    key={`${shade}-${index}`}
                    type="button"
                    aria-label={`Usar color ${index + 1}, ${shade}`}
                    aria-pressed={color === shade}
                    data-active={color === shade}
                    onClick={() => {
                      reset();
                      setSelectedHex(shade);
                    }}
                    className={`tap size-11 shrink-0 rounded-full outline outline-2 outline-offset-2 transition-transform ${
                      color === shade ? "scale-105 outline-accent" : "outline-fg/20"
                    }`}
                    style={{ backgroundColor: shade }}
                  />
                ))}
              </Rail>
              {color ? (
                <button
                  type="button"
                  className="tap inline-flex min-h-9 items-center gap-1.5 rounded-full bg-bg/60 px-3 font-mono text-xs text-muted"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(color);
                      toast.success(`Copiado ${color}`);
                    } catch {
                      toast.error("No se pudo copiar el código.");
                    }
                  }}
                >
                  <Copy className="size-3.5" aria-hidden="true" />
                  {color}
                </button>
              ) : null}
            </div>
          ) : null}

          <Choices
            label="Tipo de armonía"
            options={COLOR_MODES}
            value={mode}
            onChange={(nextMode) => {
              reset();
              setMode(nextMode);
            }}
          />
          <Button
            status={status}
            statusLabel={
              status === "loading"
                ? "Buscando combinaciones"
                : status === "success"
                  ? "Combinaciones listas"
                  : undefined
            }
            disabled={!color || analyzing || pending}
            icon={Sparkles}
            onClick={() => void generateIdeas()}
          >
            {status === "success" ? "Listo" : "Ver combinaciones"}
          </Button>
        </>
      )}

      {error ? <Note tone="error">{error}</Note> : null}
      {result && color ? <ColorResults color={color} result={result} /> : null}
      <p className="text-xs text-muted">
        Ideas de armonía de color de{" "}
        <a
          className="underline underline-offset-2"
          href="https://www.thecolorapi.com/"
          target="_blank"
          rel="noreferrer noopener"
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
      data-active={active}
      onClick={onPick}
      className={`tap flex min-h-14 min-w-32 shrink-0 items-center gap-2 rounded-2xl border px-2.5 py-2 text-left text-xs ${
        active ? "border-accent bg-bg text-fg" : "border-fg/10 bg-bg/40 text-muted"
      }`}
    >
      <img src={garment.url} alt="" className="size-10 rounded-lg object-cover" loading="lazy" />
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
            className="stagger flex items-center gap-2 rounded-xl bg-surface p-2"
            style={{ ["--i" as string]: index }}
          >
            <button
              type="button"
              aria-label={`Copiar el código ${shade.hex}`}
              className="tap flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shade.hex);
                  toast.success(`Copiado ${shade.hex}`);
                } catch {
                  toast.error("No se pudo copiar el código.");
                }
              }}
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
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ Clima */

type Unit = "c" | "f";

function WeatherAdvisor() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<GeoPlace[]>([]);
  const [activePlace, setActivePlace] = useState<GeoPlace | null>(null);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [stale, setStale] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState<Unit>("c");
  const searchRequest = useRef<AbortController | null>(null);
  const weatherRequest = useRef<AbortController | null>(null);

  const known = useMemo(() => [...POPULAR, ...remote], [remote]);

  useEffect(
    () => () => {
      searchRequest.current?.abort();
      weatherRequest.current?.abort();
      searchRequest.current = null;
      weatherRequest.current = null;
    },
    [],
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (normalizeText(trimmed).length < 2) {
      setRemote([]);
      setSearching(false);
      return;
    }
    // Búsqueda con retardo: sólo se consulta al dejar de escribir.
    const timer = window.setTimeout(() => {
      searchRequest.current?.abort();
      const controller = new AbortController();
      searchRequest.current = controller;
      setSearching(true);
      setError("");
      void searchPlaces(trimmed, controller.signal)
        .then((matches) => {
          if (!controller.signal.aborted) setRemote(matches);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setError("No se pudo buscar la ciudad. Revisa tu conexión e inténtalo de nuevo.");
          }
        })
        .finally(() => {
          if (searchRequest.current === controller) {
            searchRequest.current = null;
            setSearching(false);
          }
        });
    }, 420);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function choosePlace(place: GeoPlace) {
    weatherRequest.current?.abort();
    const controller = new AbortController();
    weatherRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setQuery(`${place.name}${place.country ? `, ${place.country}` : ""}`);
    setActivePlace(place);
    setWeather(null);
    setStale(false);
    setLoadingWeather(true);
    setError("");
    try {
      const result = await getWeatherForPlace(place, controller.signal);
      if (!controller.signal.aborted) {
        setWeather(result.summary);
        setStale(result.stale);
      }
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

  const options: ComboOption[] = useMemo(
    () =>
      known.map((place) => ({
        id: String(place.id) + `${place.latitude},${place.longitude}`,
        label: place.name,
        sublabel: [place.admin1 && place.admin1 !== place.name ? place.admin1 : "", place.country]
          .filter(Boolean)
          .join(" · "),
        keywords: place.country,
      })),
    [known],
  );

  return (
    <section className="card space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-lagoon/15 text-lagoon">
          <CloudSun className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-display text-2xl leading-tight">Vístete según el clima</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Busca una ciudad para ver las condiciones de hoy y una sugerencia de capas.
          </p>
        </div>
      </div>

      <Combobox
        id="style-city"
        label="Ciudad o localidad"
        hint="Escribe al menos dos letras. Sugerimos ciudades y buscamos la tuya sin pedir tu ubicación."
        placeholder="Ej. Madrid"
        value={query}
        onValueChange={setQuery}
        options={options}
        loading={searching}
        open={open}
        onOpenChange={setOpen}
        emptyMessage="Sin coincidencias. Prueba con el nombre de la ciudad y el país."
        onSelect={(id) => {
          const place = known.find((item) => String(item.id) + `${item.latitude},${item.longitude}` === id);
          if (place) void choosePlace(place);
        }}
      />

      <Choices
        label="Unidad de temperatura"
        options={[
          { id: "c", label: "°C" },
          { id: "f", label: "°F" },
        ]}
        value={unit}
        onChange={setUnit}
      />

      {loadingWeather ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          Consultando el pronóstico…
        </p>
      ) : null}
      {error ? <Note tone="error">{error}</Note> : null}
      {stale ? <Note>Sin conexión: se muestra el último pronóstico guardado para esta ciudad.</Note> : null}
      {activePlace && weather ? (
        <WeatherResult place={activePlace} weather={weather} unit={unit} />
      ) : null}

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
          rel="noreferrer noopener"
        >
          Open-Meteo
        </a>
        {" · "}
        <a
          className="underline underline-offset-2"
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer noopener"
        >
          CC BY 4.0
        </a>
        .
      </p>
    </section>
  );
}

function WeatherResult({
  place,
  weather,
  unit,
}: {
  place: GeoPlace;
  weather: WeatherSummary;
  unit: Unit;
}) {
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
  const round = (value: number) =>
    unit === "c" ? Math.round(value) : Math.round(value * 1.8 + 32);

  return (
    <div className="animate-marquee-in space-y-4 rounded-2xl bg-bg/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted">
            {place.name}
            {place.country ? ` · ${place.country}` : ""}
          </p>
          <p className="mt-1 text-sm">{describeWeatherCode(weather.weatherCode)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <WeatherIcon className="animate-float-soft size-7 text-accent" aria-hidden="true" />
          <span className="font-display text-3xl">{round(weather.temperatureC)}°</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted">
        <div className="flex items-center gap-2 rounded-xl bg-surface p-3">
          <Thermometer className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <span>
            Sensación {round(weather.feelsLikeC)}°
            {weather.highC !== null && weather.lowC !== null
              ? ` · ${round(weather.lowC)}° / ${round(weather.highC)}°`
              : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-surface p-3">
          <Wind className="size-4 shrink-0 text-accent" aria-hidden="true" />
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
          <Sparkles className="size-4 text-accent" aria-hidden="true" />
          Idea para vestirte
        </p>
        <ul className="space-y-1.5 text-sm leading-relaxed text-muted">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              className="stagger flex gap-2"
              style={{ ["--i" as string]: index }}
            >
              <MapPin className="mt-1 size-3.5 shrink-0 text-accent" aria-hidden="true" />
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
