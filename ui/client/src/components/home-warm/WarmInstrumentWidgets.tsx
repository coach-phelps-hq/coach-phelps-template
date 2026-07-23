import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "wouter";
import { Dumbbell } from "lucide-react";
import { ActivityGlyph, type ActivityGlyphKind } from "./ActivityGlyph";

export type SportAnalyticsNavLink = {
  glyph: Extract<ActivityGlyphKind, "badminton" | "run" | "calisthenics">;
  href: string;
  title: string;
};

const DEFAULT_SPORT_ANALYTICS_LINKS: SportAnalyticsNavLink[] = [
  { glyph: "badminton", href: "/analytics/badminton", title: "Badminton analytics" },
  { glyph: "run", href: "/analytics/running", title: "Running analytics" },
  { glyph: "calisthenics", href: "/analytics/calisthenics", title: "Calisthenics analytics" },
];

export type WarmSportId =
  | "cycling"
  | "badminton"
  | "calisthenics"
  | "foundation"
  | "run"
  | "other";

export interface ActivityInspectionSnapshot {
  id: string;
  dateKey: string;
  dateLabel: string;
  title: string;
  sport: WarmSportId;
  ranked: boolean;
  durationMinutes: number;
  calories: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  distanceKm: number | null;
  load: number | null;
  source: string;
}

export interface TrendPointSnapshot {
  label: string;
  value: number;
  weekLabel?: string;
}

export interface LoadMixSnapshot {
  id: WarmSportId;
  label: string;
  shortLabel: string;
  hours: number;
  color: string;
}

export interface DoseRowSnapshot {
  day: string;
  title: string;
  detail?: string;
  load: number | null;
  sport: WarmSportId;
  isRest?: boolean;
}

export interface EngineSnapshot {
  weekLabel: string;
  load: number;
  signal: string;
  verdict: string;
  compactVerdict?: string;
  openVerdict?: string;
  bandLow: number | null;
  bandHigh: number | null;
  scaleLow: number;
  scaleHigh: number;
  trend: TrendPointSnapshot[];
  mix: LoadMixSnapshot[];
  totalHours: number;
  method: string;
  doseRows: DoseRowSnapshot[];
}

export interface QuestSideSnapshot {
  id?: string;
  name: string;
  value: number;
  target: number;
  color: string;
  notes?: string;
}

export interface QuestSnapshot {
  name: string;
  completed: number;
  target: number;
  loaded: number;
  daysLeft: number;
  sideQuests: QuestSideSnapshot[];
  streakLabel?: string;
}

export interface CoachReadSnapshot {
  dateLabel: string;
  body: string;
  eyebrow?: string;
  signature?: string;
  actionLabel?: string;
  isPreview?: boolean;
  evidence?: string[];
}

export interface CommitmentSnapshot {
  id: "cycling" | "badminton" | "calisthenics" | "foundation";
  label: string;
  glyph: ActivityGlyphKind;
  value: number;
  target: number | null;
  note: string;
  status: string;
  progress: number | null;
  accent: string;
  alarm?: boolean;
  allRecord?: string;
  rankedRecord?: string;
  hasRankedRecord?: boolean;
  latest?: ActivityInspectionSnapshot;
  latestRanked?: ActivityInspectionSnapshot;
  streak?: number;
}

export interface PlanDaySnapshot {
  key: string;
  day: string;
  dayShort: string;
  glyph: ActivityGlyphKind | null;
  sport: WarmSportId | "recovery";
  title: string;
  loadDelta: number | null;
  isRecorded?: boolean;
  href?: string;
  activities?: ActivityInspectionSnapshot[];
}

export interface WeeklyPlanSnapshot {
  label: string;
  isPreview: boolean;
  title?: string;
  statusLabel?: string;
  bandLow: number | null;
  bandHigh: number | null;
  days: PlanDaySnapshot[];
}

export interface CaloriesSnapshot {
  monthLabel: string;
  current: number;
  target: number | null;
  daysLeft: number;
  daysInMonth: number;
  pacePercent: number;
  dailyActual: number[];
  dailyNeeded: number | null;
  targetIsFixture?: boolean;
  elapsedDays?: number;
  activeDays?: number;
  highestDayLabel?: string;
  highestDayCalories?: number;
}

export type ActivityCellState =
  | "empty"
  | "badminton"
  | "calisthenics"
  | "foundation"
  | "cycling"
  | "run"
  | "planned-missed";

export interface ActivityMonthSnapshot {
  label: string;
  cells: ActivityCellState[];
  dates?: Array<string | null>;
}

export interface TrainingActivitySnapshot {
  rangeLabel: string;
  months: ActivityMonthSnapshot[];
  longestBlock: number;
  activeDays: number;
  planTruePercent: number | null;
  gapCount: number;
  worstGap: number;
  read: string;
  dayDetails?: Record<string, {
    dateLabel: string;
    activities: ActivityInspectionSnapshot[];
    durationMinutes: number;
    load: number | null;
  }>;
}

export interface Vo2Snapshot {
  status: "available" | "unavailable";
  value: number | null;
  delta: number | null;
  percentileLabel?: string;
  trend: TrendPointSnapshot[];
  read: string;
}

export interface RecentSessionSnapshot {
  id: string;
  dateLabel: string;
  title: string;
  detail: string;
  load: number | null;
  sport: WarmSportId;
  href?: string;
  evidence?: ActivityInspectionSnapshot;
}

export interface PhaseMilestoneSnapshot {
  id?: string;
  name: string;
  baseline: string;
  current?: string;
  target: string;
  note?: string;
  // Progress %, present only for milestones that carry structured numeric
  // progress (single-scalar goals). Bilateral / set×rep goals render terse-only.
  progressPercent?: number | null;
  // Real per-goal ETA once the pipeline emits it; undefined until then.
  projectedDateLabel?: string;
}

export interface BuildPhaseSnapshot {
  weekLabel: string;
  title?: string;
  milestones: PhaseMilestoneSnapshot[];
  read: string;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatCompact(value: number) {
  if (value >= 1000) {
    const digits = value >= 10_000 ? 0 : 1;
    return `${(value / 1000).toFixed(digits).replace(/\.0$/, "")}K`;
  }
  return Math.round(value).toLocaleString("en-GB");
}

function GaugeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="m12 15 4.5-4.5" />
      <circle cx="12" cy="15" r="1.6" />
    </svg>
  );
}

function AnalyticsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M4 20V13" />
      <path d="M10 20V6" />
      <path d="M16 20V10" />
      <path d="M22 4" />
      <path d="M4 20H20" />
    </svg>
  );
}

function SyncIcon({ healthy }: { healthy: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={healthy ? "is-healthy" : "is-warning"}
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
    >
      <path d="M20 5v5h-5" />
      <path d="M4 19v-5h5" />
      <path d="M19.6 10A8 8 0 0 0 6.4 6.6L4 9" />
      <path d="M4.4 14a8 8 0 0 0 13.2 3.4L20 15" />
    </svg>
  );
}

export function InstrumentHeader({
  phaseLabel,
  mobilePhaseLabel,
  syncLabel,
  syncHealthy,
  onOpenSync,
  homeHref = "/",
  sportAnalyticsLinks = DEFAULT_SPORT_ANALYTICS_LINKS,
  analyticsHref = "/analytics/monthly",
  workoutsHref = "/workouts",
  currentRoute,
}: {
  phaseLabel: string;
  mobilePhaseLabel?: string;
  syncLabel: string;
  syncHealthy: boolean;
  onOpenSync?: () => void;
  homeHref?: string;
  sportAnalyticsLinks?: SportAnalyticsNavLink[];
  analyticsHref?: string;
  workoutsHref?: string;
  /** Which nav href matches the current page, for aria-current + active styling. */
  currentRoute?: string;
}) {
  const syncTitle = `Synced · ${syncLabel}`;
  return (
    <header className="wi-instrument-header">
      <Link className="wi-instrument-header__brand" href={homeHref}>
        <span className="wi-desktop-only">COACH PHELPS · HQ</span>
        <span className="wi-mobile-only">HQ</span>
      </Link>
      <span className="wi-instrument-header__phase">
        <span className="wi-desktop-only">{phaseLabel}</span>
        <span className="wi-mobile-only">{mobilePhaseLabel ?? phaseLabel}</span>
      </span>
      {onOpenSync ? (
        <button
          aria-haspopup="dialog"
          aria-label={`Open sync details. ${syncTitle}.`}
          className="wi-instrument-header__sync wi-instrument-header__sync-button"
          onClick={onOpenSync}
          type="button"
        >
          <SyncIcon healthy={syncHealthy} />
          <span className="wi-instrument-header__sync-tip" role="tooltip">{syncTitle}</span>
        </button>
      ) : (
        <span className="wi-instrument-header__sync" tabIndex={0} aria-label={syncTitle}>
          <SyncIcon healthy={syncHealthy} />
          <span className="wi-instrument-header__sync-tip" role="tooltip" aria-hidden="true">{syncTitle}</span>
        </span>
      )}
      <nav className="wi-instrument-header__nav" aria-label="Primary navigation">
        <Link
          aria-current={currentRoute === homeHref ? "page" : undefined}
          className={currentRoute === homeHref ? "is-active" : undefined}
          href={homeHref}
          title="Engine"
        >
          <GaugeIcon />
          <span className="sr-only">Engine</span>
        </Link>
        {sportAnalyticsLinks.map((link) => (
          <Link
            key={link.href}
            aria-current={currentRoute === link.href ? "page" : undefined}
            className={currentRoute === link.href ? "is-active" : undefined}
            href={link.href}
            title={link.title}
          >
            <ActivityGlyph kind={link.glyph} size={20} />
            <span className="sr-only">{link.title}</span>
          </Link>
        ))}
        <Link
          aria-current={currentRoute === analyticsHref ? "page" : undefined}
          className={currentRoute === analyticsHref ? "is-active" : undefined}
          href={analyticsHref}
          title="Monthly analytics"
        >
          <AnalyticsIcon />
          <span className="sr-only">Monthly analytics</span>
        </Link>
        <Link
          aria-current={currentRoute === workoutsHref ? "page" : undefined}
          className={currentRoute === workoutsHref ? "is-active" : undefined}
          href={workoutsHref}
          title="Workouts"
        >
          <Dumbbell size={20} strokeWidth={1.8} />
          <span className="sr-only">Workouts</span>
        </Link>
      </nav>
    </header>
  );
}

function EngineGauge({ engine }: { engine: EngineSnapshot }) {
  const width = 500;
  const range = Math.max(1, engine.scaleHigh - engine.scaleLow);
  const x = (value: number) =>
    clamp(((value - engine.scaleLow) / range) * width, 0, width);
  const fallbackLow = engine.load * 0.8;
  const fallbackHigh = engine.load * 1.2;
  const bandLow = engine.bandLow ?? fallbackLow;
  const bandHigh = engine.bandHigh ?? fallbackHigh;
  const bandX = x(bandLow);
  const bandWidth = Math.max(12, x(bandHigh) - bandX);
  const markerX = x(engine.load);

  return (
    <svg
      className="wi-engine-gauge"
      role="img"
      viewBox="0 0 500 88"
      aria-label={`Current load ${engine.load}; usual band ${Math.round(bandLow)} to ${Math.round(bandHigh)}.`}
    >
      <line x1="0" x2="500" y1="48" y2="48" />
      <rect height="20" rx="4" width={bandWidth} x={bandX} y="38" />
      <path d={`M${markerX} 32l6-11h-12z`} />
      <line className="wi-engine-gauge__marker" x1={markerX} x2={markerX} y1="32" y2="64" />
      <text x={bandX} y="28">{Math.round(bandLow)}</text>
      <text textAnchor="end" x={bandX + bandWidth} y="28">
        {Math.round(bandHigh)}
      </text>
      <text className="is-muted" x="0" y="84">{engine.scaleLow}</text>
      <text className="is-muted" textAnchor="end" x="500" y="84">{engine.scaleHigh}</text>
    </svg>
  );
}

function EngineTrend({ points }: { points: TrendPointSnapshot[] }) {
  const width = 820;
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const safePoints = points.length > 0 ? points : [{ label: "NOW", value: 0 }];
  const values = safePoints.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);
  const coordinates = safePoints.map((point, index) => ({
    x: safePoints.length === 1 ? width : (index / (safePoints.length - 1)) * width,
    y: 108 - ((point.value - minimum) / range) * 52,
  }));
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const last = coordinates.at(-1) ?? { x: width, y: 84 };
  const scrubPoint = scrubIndex === null ? null : safePoints[scrubIndex];
  const scrubCoordinate = scrubIndex === null ? null : coordinates[scrubIndex];

  function handleScrub(event: ReactMouseEvent<SVGSVGElement>) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
    setScrubIndex(Math.round(fraction * (safePoints.length - 1)));
  }

  return (
    <svg
      aria-label="Six-week load trend. Hover to inspect each week."
      className="wi-engine-trend wi-trend-scrub"
      data-wi-scrub="engine"
      onMouseLeave={() => setScrubIndex(null)}
      onMouseMove={handleScrub}
      role="img"
      viewBox="0 0 820 180"
    >
      <rect height="76" rx="14" width="820" x="0" y="42" />
      <polyline points={polyline} />
      <circle cx={last.x} cy={last.y} r="5.5" />
      {scrubCoordinate && scrubPoint ? (
        <g aria-hidden="true" data-wi-scrub-index={scrubIndex ?? undefined}>
          <line
            className="wi-trend-scrub__guide"
            x1={scrubCoordinate.x}
            x2={scrubCoordinate.x}
            y1="42"
            y2="118"
          />
          <foreignObject
            className="wi-trend-scrub__chip"
            height="30"
            width="132"
            x={clamp(scrubCoordinate.x - 66, 0, width - 132)}
            y="4"
          >
            <div>{(scrubPoint.weekLabel ?? scrubPoint.label).toUpperCase()} · {scrubPoint.value}</div>
          </foreignObject>
        </g>
      ) : null}
      <text x="0" y="176">{safePoints[0]?.label.toUpperCase()}</text>
      <text textAnchor="end" x="820" y="176">
        {safePoints.at(-1)?.label.toUpperCase()}
      </text>
    </svg>
  );
}

function EngineMix({ mix, totalHours }: { mix: LoadMixSnapshot[]; totalHours: number }) {
  const trackedHours = mix.reduce((sum, item) => sum + item.hours, 0);
  const denominator = Math.max(totalHours, trackedHours, 1);

  return (
    <div className="wi-engine-mix">
      <div className="wi-engine-mix__bar" aria-hidden="true">
        {mix.map((item) => (
          <span
            key={item.id}
            style={{
              "--mix-color": item.color,
              width: `${(item.hours / denominator) * 100}%`,
            } as CSSProperties}
          />
        ))}
        <i />
      </div>
      <div className="wi-engine-mix__legend">
        {mix.filter((item) => item.hours > 0).map((item) => (
          <span key={item.id}>
            <i style={{ "--mix-color": item.color } as CSSProperties} />
            <span className="wi-desktop-only">{item.label.toUpperCase()} {item.hours.toFixed(1)}H</span>
            <span className="wi-mobile-only">{item.shortLabel.toUpperCase()} {item.hours.toFixed(1)}H</span>
          </span>
        ))}
        <span className="wi-engine-mix__total">{totalHours.toFixed(1)}H<span className="wi-desktop-only"> LOGGED</span></span>
      </div>
    </div>
  );
}

export function EngineCard({ engine }: { engine: EngineSnapshot }) {
  return (
    <section className="wi-engine-card">
      <div className="wi-engine-card__topline">
        <span>ENGINE · {engine.weekLabel}</span>
        <span className="wi-engine-card__signal">{engine.signal}</span>
      </div>
      <div className="wi-engine-card__readout">
        <div className="wi-engine-card__number">
          <strong>{engine.load}</strong>
          <em>
            <span className="wi-desktop-only">{engine.verdict}</span>
            <span className="wi-mobile-only">{engine.compactVerdict ?? engine.verdict}</span>
          </em>
        </div>
        <EngineGauge engine={engine} />
        <EngineTrend points={engine.trend} />
      </div>
      <EngineMix mix={engine.mix} totalHours={engine.totalHours} />
      <div className="wi-engine-card__method">{engine.method}</div>
    </section>
  );
}

export function QuestCard({
  quest,
  compact = false,
}: {
  quest: QuestSnapshot;
  compact?: boolean;
}) {
  const progress = quest.target > 0 ? clamp((quest.completed / quest.target) * 100, 0, 100) : 0;

  return (
    <section className={`wi-quest-card ${compact ? "is-compact" : ""}`.trim()}>
      <div className="wi-card-kicker">
        <span>MAIN QUEST</span>
      </div>
      <div className="wi-quest-card__main">
        <span>{quest.name}</span>
        <strong>{quest.completed}<small> / {quest.target}</small></strong>
      </div>
      <div className="wi-progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
      {!compact && quest.sideQuests.length > 0 ? (
        <div className="wi-quest-card__sides">
          <span className="wi-card-label">SIDE QUESTS</span>
          {quest.sideQuests.slice(0, 2).map((item) => {
            const sideProgress = item.target > 0
              ? clamp((item.value / item.target) * 100, 0, 100)
              : 0;
            return (
              <div className="wi-side-quest" key={item.name}>
                <div><strong>{item.name}</strong><span>{item.value}/{item.target}</span></div>
                <div className="wi-progress-track">
                  <span style={{ "--quest-color": item.color, width: `${sideProgress}%` } as CSSProperties} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function CoachReadCard({ read }: { read: CoachReadSnapshot }) {
  return (
    <section className="wi-coach-read-card">
      <span className="wi-card-label">{read.eyebrow ?? "COACH'S READ"} · {read.dateLabel}</span>
      <p>{read.body}</p>
      <strong>{read.signature ?? "— PHELPS"}</strong>
    </section>
  );
}

function CommitmentBody({
  item,
  record,
  label,
  onToggle,
  pressed,
}: {
  item: CommitmentSnapshot;
  record: string | undefined;
  label: string;
  onToggle?: () => void;
  pressed?: boolean;
}) {
  return (
    <>
      <div className="wi-commitment-card__top">
        <ActivityGlyph kind={item.glyph} size={36} />
        <strong>{item.value}<small>{item.target === null ? "" : `/${item.target}`}</small></strong>
      </div>
      <div className="wi-commitment-card__bottom">
        {item.alarm ? <em>The bar is cold.</em> : null}
        <div className={`wi-commitment-card__rule ${item.progress === null ? "is-recorded" : ""}`.trim()}>
          <span style={{ width: `${item.progress === null ? (item.value > 0 ? 100 : 0) : clamp(item.progress, 0, 100)}%` }} />
        </div>
        <div className="wi-commitment-card__meta">
          <span>{record ?? item.note}</span>
          {onToggle ? (
            <button
              type="button"
              className="wi-commitment-card__toggle"
              onClick={onToggle}
              aria-pressed={pressed}
              aria-label={`Show ${pressed ? "all" : "ranked"} badminton record`}
            >
              {label}
            </button>
          ) : (
            <b>{label}</b>
          )}
        </div>
      </div>
      <span className="sr-only">{item.label}</span>
    </>
  );
}

export function SportCommitmentCard({ item }: { item: CommitmentSnapshot }) {
  const [showRanked, setShowRanked] = useState(false);
  const canToggle = item.id === "badminton" && Boolean(item.hasRankedRecord && item.rankedRecord);
  const showingRanked = canToggle && showRanked;
  const className = [
    "wi-commitment-card",
    `is-${item.id}`,
    item.alarm ? "is-alarm" : "",
  ].filter(Boolean).join(" ");
  const style = { "--sport-accent": item.accent } as CSSProperties;
  const record = item.id === "badminton"
    ? showingRanked ? item.rankedRecord : item.allRecord
    : undefined;
  const label = item.id === "badminton"
    ? showingRanked ? "RANKED" : "ALL"
    : item.status;

  return (
    <article className={className} style={style}>
      <CommitmentBody
        item={item}
        record={record}
        label={label}
        onToggle={canToggle ? () => setShowRanked((value) => !value) : undefined}
        pressed={showingRanked}
      />
    </article>
  );
}

type PlanAssignment = Pick<
  PlanDaySnapshot,
  "activities" | "glyph" | "href" | "isRecorded" | "loadDelta" | "sport" | "title"
>;

function assignmentFromDay(day: PlanDaySnapshot): PlanAssignment {
  return {
    activities: day.activities,
    glyph: day.glyph,
    href: day.href,
    isRecorded: day.isRecorded,
    loadDelta: day.loadDelta,
    sport: day.sport,
    title: day.title,
  };
}

function swapPlanAssignments(
  current: PlanAssignment[],
  fromIndex: number,
  toIndex: number,
) {
  if (fromIndex === toIndex) return current;
  const next = [...current];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}

export function WeeklyPlanCard({ plan }: { plan: WeeklyPlanSnapshot }) {
  const instructionsId = useId();
  const slotsRef = useRef<Array<HTMLDivElement | null>>([]);
  const dragFromRef = useRef<number | null>(null);
  const [assignments, setAssignments] = useState<PlanAssignment[]>(
    () => plan.days.map(assignmentFromDay),
  );
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setAssignments(plan.days.map(assignmentFromDay));
    setGrabbedIndex(null);
    dragFromRef.current = null;
  }, [plan]);

  const projection = useMemo(() => {
    const knownLoads = assignments
      .map((assignment) => assignment.loadDelta)
      .filter((load): load is number => load !== null);
    if (knownLoads.length === 0) {
      return { label: "Projection unavailable", state: "is-unavailable" };
    }

    const total = knownLoads.reduce((sum, load) => sum + load, 0);
    if (plan.bandLow === null || plan.bandHigh === null) {
      return { label: `Projected ≈${total} — band unavailable.`, state: "is-neutral" };
    }
    if (total > plan.bandHigh) {
      return { label: `Projected ≈${total} — over the band. Ease off.`, state: "is-alert" };
    }
    if (total < plan.bandLow) {
      return { label: `Projected ≈${total} — below the band.`, state: "is-neutral" };
    }
    const upperThreshold = plan.bandLow + ((plan.bandHigh - plan.bandLow) * 0.7);
    return total > upperThreshold
      ? { label: `Projected ≈${total} — upper band.`, state: "is-neutral" }
      : { label: `Projected ≈${total} — in the band.`, state: "is-neutral" };
  }, [assignments, plan.bandHigh, plan.bandLow]);

  function moveAssignment(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || !assignments[fromIndex]?.glyph) return;
    const movedTitle = assignments[fromIndex].title;
    setAssignments((current) => swapPlanAssignments(current, fromIndex, toIndex));
    setStatus(`${movedTitle} moved to ${plan.days[toIndex].day}.`);
  }

  function handleDragStart(event: ReactDragEvent<HTMLDivElement>, index: number) {
    if (!assignments[index]?.glyph) {
      event.preventDefault();
      return;
    }
    dragFromRef.current = index;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
    event.currentTarget.classList.add("is-dragging");
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    const fromIndex = dragFromRef.current;
    if (fromIndex !== null) moveAssignment(fromIndex, index);
    dragFromRef.current = null;
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>, index: number) {
    if (event.key === "Escape" && grabbedIndex !== null) {
      event.preventDefault();
      setGrabbedIndex(null);
      setStatus("Plan move cancelled.");
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const nextIndex = clamp(index + direction, 0, plan.days.length - 1);
      slotsRef.current[nextIndex]?.focus();
      return;
    }
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (grabbedIndex === null) {
      if (!assignments[index]?.glyph) return;
      setGrabbedIndex(index);
      setStatus(`${assignments[index].title} picked up. Choose a day and press Enter or Space to drop.`);
      return;
    }
    moveAssignment(grabbedIndex, index);
    setGrabbedIndex(null);
  }

  return (
    <section className="wi-plan-card">
      <div className="wi-card-kicker">
        <span>{plan.title ?? "WEEKLY PLAN"}</span>
        <b>{plan.statusLabel ?? (plan.isPreview ? "COACH DRAFT" : plan.label)}</b>
      </div>
      <div className="wi-plan-card__days" role="list">
        {plan.days.map((day, index) => {
          const assignment = assignments[index] ?? assignmentFromDay(day);
          const isGrabbed = grabbedIndex === index;
          return (
            <div className="wi-plan-day" key={day.key} role="listitem">
              <span className="wi-plan-day__label">
                <span className="wi-desktop-only">{day.dayShort}</span>
                <span className="wi-mobile-only">{day.dayShort.slice(0, 1)}</span>
              </span>
              <div
                aria-describedby={instructionsId}
                aria-label={`${day.day}: ${assignment.glyph ? assignment.title : "empty drop target"}`}
                aria-pressed={isGrabbed}
                className={`wi-plan-day__slot is-${assignment.sport} ${isGrabbed ? "is-grabbed" : ""}`.trim()}
                draggable={Boolean(assignment.glyph)}
                onDragEnd={(event) => {
                  event.currentTarget.classList.remove("is-dragging");
                  dragFromRef.current = null;
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDragStart={(event) => handleDragStart(event, index)}
                onDrop={(event) => handleDrop(event, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                ref={(element) => { slotsRef.current[index] = element; }}
                role="button"
                tabIndex={0}
                title={assignment.glyph ? `${assignment.title} — drag to move` : `Move a session to ${day.day}`}
              >
                {assignment.glyph ? <ActivityGlyph kind={assignment.glyph} size={15} /> : <span>REST</span>}
                {assignment.loadDelta !== null ? <small>+{assignment.loadDelta}</small> : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className={`wi-plan-card__projection ${projection.state}`} aria-live="polite">
        {projection.label}
      </p>
      <span className="sr-only" id={instructionsId}>
        Press Enter or Space to pick up a session, use the left and right arrows to choose a day, then press Enter or Space to drop. Press Escape to cancel.
      </span>
      <span className="sr-only" aria-live="assertive">{status}</span>
    </section>
  );
}

export function CaloriesCard({ calories }: { calories: CaloriesSnapshot }) {
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const hasTarget = calories.target !== null && calories.target > 0;
  const progress = hasTarget
    ? clamp((calories.current / calories.target!) * 100, 0, 100)
    : clamp(calories.pacePercent, 0, 100);
  const elapsedDays = Math.max(1, calories.elapsedDays ?? calories.dailyActual.length ?? 1);
  const activeDay = hoverDay === null ? null : clamp(hoverDay, 1, elapsedDays);
  const actualAtDay = activeDay === null
    ? null
    : calories.dailyActual[activeDay - 1] ?? calories.current;
  const expectedAtDay = activeDay === null || !hasTarget
    ? null
    : calories.target! * (activeDay / calories.daysInMonth);
  const hoverPercent = activeDay === null
    ? 0
    : (activeDay / calories.daysInMonth) * 100;

  function handlePaceHover(event: ReactMouseEvent<HTMLDivElement>) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
    const day = clamp(Math.round(fraction * calories.daysInMonth), 1, elapsedDays);
    setHoverDay(day);
  }

  return (
    <section className="wi-calories-card">
      <div className="wi-card-kicker">
        <span>CALORIES · {calories.monthLabel}</span>
        <b>{calories.daysLeft}D LEFT</b>
      </div>
      <div className="wi-calories-card__value">
        <strong>{formatCompact(calories.current)}</strong>
        <span>{hasTarget ? `/ ${formatCompact(calories.target!)} KCAL` : "KCAL LOGGED"}</span>
      </div>
      <div
        aria-label="Monthly calorie pace. Hover to compare actual and expected values by day."
        className="wi-calories-card__meter"
        data-wi-scrub="calories"
        onMouseLeave={() => setHoverDay(null)}
        onMouseMove={handlePaceHover}
      >
        <div className="wi-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <i style={{ left: `${clamp(calories.pacePercent, 0, 100)}%` }} />
        {activeDay !== null && actualAtDay !== null ? (
          <>
            <i className="wi-calories-card__cursor" style={{ left: `${hoverPercent}%` }} />
            <div
              className="wi-calories-card__hover"
              data-wi-calories-day={activeDay}
              style={{ left: `${hoverPercent}%` }}
            >
              <span>{activeDay} {calories.monthLabel}</span>
              <b>{formatCompact(actualAtDay)} ACTUAL</b>
              <small>{expectedAtDay === null ? "OBSERVED" : `${formatCompact(expectedAtDay)} EXPECTED`}</small>
            </div>
          </>
        ) : null}
      </div>
      <div className="wi-calories-card__meta">
        <b>{hasTarget && calories.dailyNeeded !== null ? `${Math.round(calories.dailyNeeded)}/DAY NEEDED` : "MONTH TO DATE"}</b>
      </div>
    </section>
  );
}

const ACTIVITY_LEGEND: Array<{ state: ActivityCellState; label: string }> = [
  { state: "badminton", label: "BDM" },
  { state: "calisthenics", label: "CAL" },
  { state: "foundation", label: "FDN" },
  { state: "cycling", label: "RIDE" },
  { state: "planned-missed", label: "PLANNED · MISSED" },
];

export function TrainingActivityCard({ activity }: { activity: TrainingActivitySnapshot }) {
  const visibleCount = Math.min(4, activity.months.length);
  const latestStart = Math.max(0, activity.months.length - visibleCount);
  const [windowStart, setWindowStart] = useState(latestStart);

  useEffect(() => {
    setWindowStart(Math.max(0, activity.months.length - Math.min(4, activity.months.length)));
  }, [activity.months]);

  const visibleMonths = activity.months.slice(windowStart, windowStart + visibleCount);
  const rangeLabel = `${visibleMonths[0]?.label ?? ""}–${visibleMonths.at(-1)?.label ?? ""}`;

  return (
    <section className="wi-training-card">
      <div className="wi-training-card__header">
        <span className="wi-card-label">TRAINING ACTIVITY · {rangeLabel}</span>
        <div className="wi-training-card__header-tools">
          <div className="wi-training-card__legend">
            {ACTIVITY_LEGEND.map((item) => (
              <span key={item.state}><i className={`is-${item.state}`} />{item.label}</span>
            ))}
          </div>
          <div className="wi-training-card__paging" aria-label="Training activity month window">
            <button
              aria-label="Show previous four months"
              disabled={windowStart === 0}
              onClick={() => setWindowStart((current) => Math.max(0, current - visibleCount))}
              type="button"
            >←</button>
            <button
              aria-label="Show next four months"
              disabled={windowStart >= latestStart}
              onClick={() => setWindowStart((current) => Math.min(latestStart, current + visibleCount))}
              type="button"
            >→</button>
          </div>
        </div>
      </div>
      <div className="wi-training-card__body">
        <div className="wi-training-card__months" data-wi-month-window={rangeLabel}>
          {visibleMonths.map((month) => (
            <div className="wi-activity-month" key={month.label}>
              <strong>{month.label}</strong>
              <div className="wi-activity-month__days">
                {Array.from("MTWTFSS").map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
              </div>
              <div className="wi-activity-month__grid">
                {month.cells.slice(0, 28).map((cell, index) => (
                  <i className={`is-${cell}`} key={`${month.label}-${index}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="wi-training-card__stats">
          <div><strong>{activity.longestBlock}D</strong><span>LONGEST BLOCK</span></div>
          <div><strong>{activity.planTruePercent === null ? "—" : `${activity.planTruePercent}%`}</strong><span>PLAN-TRUE</span></div>
          <div><strong>{activity.gapCount}</strong><span>GAPS · WORST {activity.worstGap}D</span></div>
        </div>
      </div>
      <p>{activity.read}</p>
    </section>
  );
}

function Vo2Trend({ points }: { points: TrendPointSnapshot[] }) {
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const width = 360;
  const values = points.map((point) => point.value);
  const minimum = values.length > 0 ? Math.min(...values) : 0;
  const maximum = values.length > 0 ? Math.max(...values) : 1;
  const range = Math.max(1, maximum - minimum);
  const coordinates = points.map((point, index) => ({
    x: points.length <= 1 ? width : (index / (points.length - 1)) * width,
    y: 59 - ((point.value - minimum) / range) * 44,
  }));
  const last = coordinates.at(-1);
  const activePoint = scrubIndex === null ? null : points[scrubIndex];
  const activeCoordinate = scrubIndex === null ? null : coordinates[scrubIndex];

  function handleScrub(event: ReactMouseEvent<SVGSVGElement>) {
    if (points.length === 0 || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
    setScrubIndex(Math.round(fraction * Math.max(0, points.length - 1)));
  }

  return (
    <svg
      aria-label={points.length > 0 ? "VO₂ Max trend. Hover to inspect observations." : "VO₂ Max trend unavailable."}
      className="wi-vo2-card__trend"
      data-wi-scrub={points.length > 0 ? "vo2" : undefined}
      onMouseLeave={points.length > 0 ? () => setScrubIndex(null) : undefined}
      onMouseMove={points.length > 0 ? handleScrub : undefined}
      viewBox="0 0 360 72"
    >
      <rect height="30" rx="7" width="360" x="0" y="22" />
      {coordinates.length > 1 ? <polyline points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")} /> : null}
      {last ? <circle cx={last.x} cy={last.y} r="4" /> : null}
      {activePoint && activeCoordinate ? (
        <g className="wi-vo2-scrub">
          <line x1={activeCoordinate.x} x2={activeCoordinate.x} y1="8" y2="58" />
          <circle cx={activeCoordinate.x} cy={activeCoordinate.y} r="4" />
          <foreignObject
            height="28"
            width="96"
            x={clamp(activeCoordinate.x - 48, 2, width - 98)}
            y={clamp(activeCoordinate.y - 31, 1, 40)}
          >
            <div className="wi-trend-scrub__chip">
              <b>{activePoint.value.toFixed(1)}</b>
              <span>{activePoint.label}</span>
            </div>
          </foreignObject>
        </g>
      ) : null}
      <text x="0" y="70">{points[0]?.label ?? "NO SOURCE"}</text>
      <text textAnchor="end" x="360" y="70">NOW</text>
    </svg>
  );
}

export function Vo2Card({ vo2 }: { vo2: Vo2Snapshot }) {
  const available = vo2.status === "available" && vo2.value !== null;

  return (
    <section className={`wi-vo2-card ${available ? "" : "is-unavailable"}`}>
      <div className="wi-card-kicker">
        <span>VO₂ MAX · 12 MO</span>
        <b>{available ? vo2.percentileLabel : "NOT IMPORTED"}</b>
      </div>
      <div className="wi-vo2-card__value">
        <strong>{available ? vo2.value?.toFixed(1) : "—"}</strong>
        <span>{available ? <>ml/kg/min · <b>▲ {vo2.delta?.toFixed(1)}</b></> : "No Apple Health VO₂ observations"}</span>
      </div>
      <Vo2Trend points={vo2.trend} />
      <p>{vo2.read}</p>
    </section>
  );
}

function SessionRow({ session }: { session: RecentSessionSnapshot }) {
  return (
    <div className="wi-session-row">
      <span className="wi-session-row__date">{session.dateLabel}</span>
      <span className={`wi-session-row__vein is-${session.sport}`} />
      <strong>{session.title}</strong>
      <span className="wi-session-row__detail">{session.detail}</span>
      <b className={`is-${session.sport}`}>
        {session.load === null ? "—" : `+${session.load}`}
        {session.load === null ? null : <span className="wi-desktop-only"> LOAD</span>}
      </b>
    </div>
  );
}

export function RecentSessionsCard({ sessions }: { sessions: RecentSessionSnapshot[] }) {
  return (
    <section className="wi-sessions-card">
      <div className="wi-card-kicker">
        <span className="wi-desktop-only">RECENT SESSIONS</span>
        <span className="wi-mobile-only">RECENT</span>
        <Link href="/analytics">All activity</Link>
      </div>
      <div className="wi-sessions-card__rows">
        {sessions.slice(0, 3).map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </div>
    </section>
  );
}

export function BuildPhaseCard({ phase }: { phase: BuildPhaseSnapshot }) {
  return (
    <section className="wi-build-card">
      <div className="wi-card-kicker">
        <span><span className="wi-desktop-only">{phase.title ?? "BUILD PHASE · IF THE PLAN HOLDS"}</span><span className="wi-mobile-only">BUILD PHASE</span></span>
        <b>{phase.weekLabel}</b>
      </div>
      <div className="wi-build-card__rail">
        <div><span /><span /><span /><span /></div>
        <div><span>BLOCK 1<span className="wi-desktop-only"> · BUILD</span></span><span>DELOAD</span><span>BLOCK 2<span className="wi-desktop-only"> · BUILD</span></span><span>TEST</span></div>
      </div>
      <div className="wi-build-card__milestones">
        {phase.milestones.slice(0, 3).map((milestone) => {
          const key = milestone.id ?? milestone.name;
          const current = milestone.current ?? milestone.baseline;
          const hasProgress = milestone.progressPercent != null;
          return (
            <div className="wi-build-card__milestone" key={key}>
              <strong>{milestone.name}</strong>
              <span>{current} → <b>{milestone.target}</b></span>
              {hasProgress ? (
                <div
                  className="wi-build-card__progress"
                  role="progressbar"
                  aria-valuenow={milestone.progressPercent!}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${milestone.name} progress`}
                >
                  <span style={{ width: `${milestone.progressPercent}%` }} />
                </div>
              ) : null}
              <aside aria-hidden="true" className="wi-build-card__badge">
                <span>{milestone.name.toUpperCase()}</span>
                <strong>{current} → {milestone.target}</strong>
                {hasProgress ? <strong>{milestone.progressPercent}% THERE</strong> : null}
                {milestone.projectedDateLabel ? <strong>ETA · {milestone.projectedDateLabel}</strong> : null}
                <small>BASELINE {milestone.baseline}{milestone.note ? ` · ${milestone.note}` : ""}</small>
              </aside>
            </div>
          );
        })}
      </div>
      <p>{phase.read}</p>
    </section>
  );
}

export function DesktopHomeGrid({ children }: { children: ReactNode }) {
  return <main className="wi-home-grid">{children}</main>;
}
