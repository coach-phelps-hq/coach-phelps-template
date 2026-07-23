import type { SVGProps } from "react";

export type ActivityMarkKind =
  | "cycling"
  | "foundation"
  | "badminton"
  | "calisthenics"
  | "run"
  | "recovery"
  | "other";

/** Backwards-compatible alias for the existing Warm Instrument snapshot types. */
export type ActivityGlyphKind = ActivityMarkKind;

interface ActivityMarkProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  kind: ActivityMarkKind;
  size?: number;
}

function BadmintonMark() {
  return (
    <>
      <circle cx="8.25" cy="8" r="4.75" />
      <path d="m11.6 11.35 7.15 7.15" />
      <path d="m16.9 16.65 2.1 2.1" strokeWidth="3" />
      <path d="m16.2 4.35 4.4-1.55-1.55 4.4Z" />
      <path d="m16.2 4.35 2.85 2.85" />
    </>
  );
}

function CyclingMark() {
  return (
    <>
      <circle cx="5.25" cy="17.25" r="3.25" />
      <circle cx="18.75" cy="17.25" r="3.25" />
      <path d="m5.25 17.25 4.1-7.05 4.5 7.05H5.25Z" />
      <path d="m9.35 10.2 5.2.05 4.2 7" />
      <path d="m13.85 17.25 2.2-7.05" />
      <path d="M7.55 7.25h3.3M15.65 7.25h3" />
    </>
  );
}

function CalisthenicsMark() {
  // Figure hanging from a pull-up bar — bodyweight/calisthenics.
  return (
    <>
      <path d="M3 4h18" />
      <path d="M9 4 11 10M15 4 13 10" />
      <circle cx="12" cy="8.3" r="1.6" />
      <path d="M12 9.9v5" />
      <path d="M12 14.9 9.8 19M12 14.9 14.2 19" />
    </>
  );
}

function FoundationMark() {
  return (
    <>
      <path d="M3 18h18" />
      <path d="M6.25 16a5.75 5.75 0 0 1 11.5 0" />
      <path d="M12 3v4" />
      <path d="m4.9 7.4 2.8 2.8M19.1 7.4l-2.8 2.8" />
      <path d="M3.5 12H6M18 12h2.5" />
    </>
  );
}

function RunMark() {
  return (
    <>
      <path d="M4 18.25h16.5" />
      <path d="M4.5 17.75c3.8-.15 6.35-2.25 7.15-6.3l3.25 1.8 1.35 2.5H20v2H4.5Z" />
      <path d="M8.15 15.2h4.2M13.9 13.15l1.4-3.15" />
      <path d="M4 9.5h4M5.25 6.5h4" />
    </>
  );
}

function RecoveryMark() {
  return (
    <>
      <path d="M19.25 15.4A7.9 7.9 0 0 1 8.6 4.2 8.25 8.25 0 1 0 19.25 15.4Z" />
      <path d="M4 19h16" />
      <path d="M7 16.6c1.4-1 2.7-1 4.1 0s2.7 1 4.1 0" />
    </>
  );
}

function OtherMark() {
  return (
    <>
      <circle cx="12" cy="12" r="8.25" />
      <path d="m12 7 1.25 3.75L17 12l-3.75 1.25L12 17l-1.25-3.75L7 12l3.75-1.25Z" />
    </>
  );
}

export function ActivityMark({ kind, size = 24, ...props }: ActivityMarkProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      vectorEffect="non-scaling-stroke"
      {...props}
    >
      {kind === "badminton" ? <BadmintonMark /> : null}
      {kind === "cycling" ? <CyclingMark /> : null}
      {kind === "calisthenics" ? <CalisthenicsMark /> : null}
      {kind === "foundation" ? <FoundationMark /> : null}
      {kind === "run" ? <RunMark /> : null}
      {kind === "recovery" ? <RecoveryMark /> : null}
      {kind === "other" ? <OtherMark /> : null}
    </svg>
  );
}

/** Existing name retained so the current Home adopts the new icon family automatically. */
export function ActivityGlyph(props: ActivityMarkProps) {
  return <ActivityMark {...props} />;
}
