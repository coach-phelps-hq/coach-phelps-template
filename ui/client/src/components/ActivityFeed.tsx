/**
 * ActivityFeed — Right column: filterable list of activity cards.
 * Athlete OS: tight rows, sport type as bold uppercase label, expandable detail.
 */
import { useState, useMemo, useEffect } from "react";
import {
  Activity,
  getSportConfig,
  getCategoryConfig,
  formatDuration,
  formatDate,
  formatTime,
  formatDistance,
  formatZoneTime,
  getRelativeDay,
  HR_ZONE_LABELS,
} from "@/lib/activities";
import { ChevronDown, ExternalLink } from "lucide-react";

interface Props {
  activities: Activity[];
  sportFilter: string;
  setSportFilter: (v: string) => void;
  timeFilter: string;
  setTimeFilter: (v: string) => void;
  sportTypes: string[];
}

const PAGE_SIZE = 10;

export function ActivityFeed({
  activities,
  sportFilter,
  setSportFilter,
  timeFilter,
  setTimeFilter,
  sportTypes,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sportFilter, timeFilter]);

  const visibleActivities = useMemo(
    () => activities.slice(0, visibleCount),
    [activities, visibleCount]
  );

  const hasMore = visibleCount < activities.length;
  const remaining = activities.length - visibleCount;

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Activity Feed
        </h2>
        <div className="flex-1" />
        <FilterSelect
          value={sportFilter}
          onChange={setSportFilter}
          options={[
            { value: "all", label: "All Sports" },
            ...sportTypes.map((s) => ({
              value: s,
              label: getSportConfig(s).label,
            })),
          ]}
        />
        <FilterSelect
          value={timeFilter}
          onChange={setTimeFilter}
          options={[
            { value: "all", label: "All Time" },
            { value: "7d", label: "7 Days" },
            { value: "30d", label: "30 Days" },
            { value: "90d", label: "90 Days" },
          ]}
        />
      </div>

      {/* Count */}
      <div className="text-xs text-muted-foreground mb-4">
        Showing {visibleActivities.length} of {activities.length} activities
      </div>

      {/* Activity List */}
      <div className="space-y-0">
        {visibleActivities.map((activity) => (
          <ActivityRow key={activity.id} activity={activity} />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full py-4 mt-2 border-2 border-foreground text-xs font-bold uppercase tracking-[0.15em] hover:bg-foreground hover:text-background transition-colors duration-150"
        >
          Load more ({Math.min(remaining, PAGE_SIZE)} of {remaining} remaining)
        </button>
      )}

      {activities.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">
          No activities match your filters.
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent border-2 border-foreground px-3 py-1.5 text-xs font-bold uppercase tracking-wider appearance-none cursor-pointer hover:bg-foreground hover:text-background transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const config = getCategoryConfig(activity);
  const hasDetail = activity.has_heartrate || activity.description;

  return (
    <div className="border-b border-foreground/10 last:border-b-0">
      <button
        onClick={() => hasDetail && setExpanded(!expanded)}
        className={`w-full text-left py-4 flex items-start gap-4 group ${
          hasDetail ? "hover:bg-muted/50" : ""
        } transition-colors duration-150`}
      >
        {/* Sport color bar */}
        <div
          className="w-1 self-stretch shrink-0 mt-0.5"
          style={{ backgroundColor: config.color, minHeight: "2.5rem" }}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {getRelativeDay(activity.start_date_local)} · {formatTime(activity.start_date_local)}
            </span>
          </div>
          <div className="font-semibold text-sm truncate">{activity.name}</div>
          <a
            href={`https://www.strava.com/activities/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors mt-0.5"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Strava</span>
          </a>
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-right">
            <div className="metric-sm">{formatDuration(activity.elapsed_time)}</div>
            <div className="text-[10px] text-muted-foreground uppercase">Duration</div>
          </div>
          {activity.calories > 0 && (
            <div className="text-right">
              <div className="metric-sm">{Math.round(activity.calories)}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Cal</div>
            </div>
          )}
          {activity.average_heartrate && (
            <div className="text-right hidden lg:block">
              <div className="metric-sm">{Math.round(activity.average_heartrate)}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Avg HR</div>
            </div>
          )}
          {activity.max_heartrate && (
            <div className="text-right hidden lg:block">
              <div className="metric-sm">{Math.round(activity.max_heartrate)}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Peak</div>
            </div>
          )}
          {activity.distance > 0 && (
            <div className="text-right hidden xl:block">
              <div className="metric-sm">{formatDistance(activity.distance)}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Dist</div>
            </div>
          )}
          {/* Zone bar — vertical strip */}
          <ZoneBar activity={activity} />
          {hasDetail && (
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-150 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="pl-5 pb-4 ml-0.5 border-l border-foreground/10">
          <div className="pl-4 space-y-4">
            {/* Description */}
            {activity.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {activity.description}
              </p>
            )}

            {/* HR Zones */}
            {activity.hr_zones && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  HR Zones
                </h4>
                <div className="space-y-1.5">
                  {HR_ZONE_LABELS.map((zone) => {
                    const data = activity.hr_zones?.[zone.key];
                    if (!data || data.seconds === 0) return null;
                    const totalSecs = Object.values(activity.hr_zones!)
                      .reduce((sum, z) => sum + (z?.seconds || 0), 0);
                    const pct = totalSecs > 0 ? (data.seconds / totalSecs) * 100 : 0;
                    return (
                      <div key={zone.key} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold w-6 text-muted-foreground">
                          {zone.label}
                        </span>
                        <div className="flex-1 h-4 bg-muted relative overflow-hidden">
                          <div
                            className="h-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: zone.color,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-16 text-right font-mono">
                          {formatZoneTime(data.seconds)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Extra metrics row */}
            <div className="flex gap-6 flex-wrap">
              {activity.distance > 0 && (
                <MetricPill label="Distance" value={formatDistance(activity.distance)} />
              )}
              {activity.total_elevation_gain > 0 && (
                <MetricPill label="Elevation" value={`${Math.round(activity.total_elevation_gain)}m`} />
              )}
              {activity.device_name && (
                <MetricPill label="Device" value={activity.device_name} />
              )}
              {activity.total_photo_count > 0 && (
                <MetricPill label="Photos" value={String(activity.total_photo_count)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ZoneBar({ activity }: { activity: Activity }) {
  if (!activity.hr_zones) return null;
  const zones = HR_ZONE_LABELS.map((z) => ({
    ...z,
    seconds: activity.hr_zones?.[z.key]?.seconds || 0,
  }));
  const total = zones.reduce((sum, z) => sum + z.seconds, 0);
  if (total === 0) return null;

  return (
    <div className="hidden sm:flex flex-col w-3 self-stretch overflow-hidden shrink-0 rounded-sm" title="HR Zone Distribution">
      {zones.map((z) => {
        const pct = (z.seconds / total) * 100;
        if (pct < 0.5) return null;
        return (
          <div
            key={z.key}
            className="w-full"
            style={{ height: `${pct}%`, backgroundColor: z.color }}
          />
        );
      })}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}
