import { useState, type MouseEvent as ReactMouseEvent } from "react";
import type { EngineSnapshot, TrendPointSnapshot } from "@/components/home-warm/WarmInstrumentWidgets";

const TREND_WIDTH = 280;
const TREND_HEIGHT = 86;
const BAND_TOP = 24;
const BAND_HEIGHT = 42;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatVerdict(engine: EngineSnapshot): string {
  const tail = (engine.openVerdict ?? engine.verdict).toLowerCase();
  if (engine.signal === "IN BAND") {
    return `Optimal engine — ${tail}`;
  }
  if (engine.signal === "ABOVE BAND") {
    return `Hot engine — ${tail}`;
  }
  return `Building engine — ${tail}`;
}

function weeksInBand(engine: EngineSnapshot): number {
  if (engine.bandLow === null || engine.bandHigh === null) {
    return 0;
  }
  return engine.trend.filter(
    (point) => point.value >= engine.bandLow! && point.value <= engine.bandHigh!,
  ).length;
}

function buildTrendSeries(points: EngineSnapshot["trend"]) {
  const trend: TrendPointSnapshot[] =
    points.length > 0 ? points.slice(-6) : [{ label: "NOW", value: 0, weekLabel: "NOW" }];
  const values = trend.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);

  const coordinates = trend.map((point, index) => ({
    x: trend.length === 1 ? TREND_WIDTH : (index / (trend.length - 1)) * TREND_WIDTH,
    y: BAND_TOP + BAND_HEIGHT - ((point.value - minimum) / range) * BAND_HEIGHT,
  }));

  return { trend, coordinates };
}

function LoginEngineTrend({ points }: { points: EngineSnapshot["trend"] }) {
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const { trend, coordinates } = buildTrendSeries(points);
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const last = coordinates.at(-1) ?? { x: TREND_WIDTH, y: BAND_TOP };
  const scrubPoint = scrubIndex === null ? null : trend[scrubIndex];
  const scrubCoordinate = scrubIndex === null ? null : coordinates[scrubIndex];
  const chipWidth = 118;

  function handleScrub(event: ReactMouseEvent<SVGSVGElement>) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
    setScrubIndex(Math.round(fraction * (trend.length - 1)));
  }

  return (
    <svg
      aria-label="Six-week load trend. Hover to inspect each week."
      className="login-engine-hero__trend wi-trend-scrub"
      data-wi-scrub="login-engine"
      onMouseLeave={() => setScrubIndex(null)}
      onMouseMove={handleScrub}
      role="img"
      viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
      preserveAspectRatio="none"
    >
      <rect x="0" y={BAND_TOP} width={TREND_WIDTH} height={BAND_HEIGHT} rx="9" />
      <polyline points={polyline} />
      <circle cx={last.x} cy={last.y} r="4.5" className="login-engine-hero__trend-end" />
      {scrubCoordinate && scrubPoint ? (
        <g aria-hidden="true" data-wi-scrub-index={scrubIndex ?? undefined}>
          <line
            className="wi-trend-scrub__guide"
            x1={scrubCoordinate.x}
            x2={scrubCoordinate.x}
            y1={BAND_TOP}
            y2={BAND_TOP + BAND_HEIGHT}
          />
          <foreignObject
            className="wi-trend-scrub__chip"
            height="26"
            width={chipWidth}
            x={clamp(scrubCoordinate.x - chipWidth / 2, 0, TREND_WIDTH - chipWidth)}
            y="2"
          >
            <div>
              {(scrubPoint.weekLabel ?? scrubPoint.label).toUpperCase()} · {scrubPoint.value}
            </div>
          </foreignObject>
          <circle
            className="login-engine-hero__trend-scrub-dot"
            cx={scrubCoordinate.x}
            cy={scrubCoordinate.y}
            r="4.5"
          />
        </g>
      ) : null}
      <text className="login-engine-hero__trend-axis" x="0" y={TREND_HEIGHT - 4}>
        {trend[0]?.label.toUpperCase()}
      </text>
      <text className="login-engine-hero__trend-axis" textAnchor="end" x={TREND_WIDTH} y={TREND_HEIGHT - 4}>
        {trend.at(-1)?.label.toUpperCase()}
      </text>
    </svg>
  );
}

export function LoginEngineHero({ engine }: { engine: EngineSnapshot }) {
  const bandWeeks = weeksInBand(engine);
  const footer =
    bandWeeks > 0
      ? `LAST SEEN · ${bandWeeks} WEEK${bandWeeks === 1 ? "" : "S"} IN BAND`
      : `${engine.signal} · ${engine.weekLabel}`;

  return (
    <aside className="login-engine-hero" aria-label="Weekly engine load">
      <div className="login-engine-hero__top">
        <span className="login-engine-hero__label">ENGINE · {engine.weekLabel}</span>
        <span className="login-engine-hero__dot" aria-hidden="true" />
      </div>
      <div className="login-engine-hero__value">{engine.load}</div>
      <p className="login-engine-hero__verdict">{formatVerdict(engine)}</p>
      <LoginEngineTrend points={engine.trend} />
      <div className="login-engine-hero__foot">{footer}</div>
    </aside>
  );
}
