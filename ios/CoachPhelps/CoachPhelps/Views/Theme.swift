import SwiftUI

/// Design tokens matching the Coach Phelps HQ website (coach-phelps.netlify.app).
///
/// Source of truth: `ui/client/src/lib/activities.ts` (SPORT_CONFIG) and the site's
/// CSS variables — white background, near-black foreground, sharp corners,
/// 10pt bold uppercase tracked section headers, sport-colored left bars, and a
/// green accent for progress/active states.
enum Theme {
    // MARK: - Appearance

    /// UserDefaults key for the Settings appearance toggle. The app defaults to
    /// light mode (the primary use case, matching the website); users can opt
    /// into dark mode from Settings → Appearance.
    static let darkModeKey = "appearanceDarkMode"

    // MARK: - Core palette

    /// Brand red — the "COACH PHELPS HQ" wordmark color (site --primary, ~#FF4D00 family).
    static let brandRed = Color(red: 0.86, green: 0.18, blue: 0.08)

    /// Green accent for progress indicators and active states (#2d8a4e).
    static let accentGreen = Color(red: 0x2D / 255.0, green: 0x8A / 255.0, blue: 0x4E / 255.0)

    /// Orange used for "needs attention" indicators (badminton without scores).
    static let attentionOrange = Color(red: 0xF5 / 255.0, green: 0x9E / 255.0, blue: 0x0B / 255.0)

    /// Near-black used for the top bar and strong borders (site foreground, oklch 5%).
    static let ink = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(white: 0.08, alpha: 1)
            : UIColor(white: 0.05, alpha: 1)
    })

    /// Card background — white in light mode, elevated dark in dark mode.
    static let cardBackground = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor.secondarySystemBackground
            : UIColor.white
    })

    /// Subtle light gray card border (site uses light hairlines inside cards).
    static let cardBorder = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(white: 0.25, alpha: 1)
            : UIColor(white: 0.85, alpha: 1)
    })

    /// Muted background (site --muted, oklch 95%).
    static let mutedBackground = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(white: 0.15, alpha: 1)
            : UIColor(white: 0.95, alpha: 1)
    })

    /// Corner radius — soft, modern iOS card rounding.
    static let cornerRadius: CGFloat = 12

    /// Sharper radius for summary/stat cards (neo-brutalist, matching the website).
    static let summaryCardRadius: CGFloat = 6

    /// HR zone colors matching the website's HR_ZONE_LABELS (Z1 → Z5).
    static let hrZoneColors: [Color] = [
        Color(red: 0x93/255.0, green: 0xC5/255.0, blue: 0xFD/255.0), // Z1 light blue
        Color(red: 0x22/255.0, green: 0xC5/255.0, blue: 0x5E/255.0), // Z2 green
        Color(red: 0xEA/255.0, green: 0xB3/255.0, blue: 0x08/255.0), // Z3 yellow
        Color(red: 0xF9/255.0, green: 0x73/255.0, blue: 0x16/255.0), // Z4 orange
        Color(red: 0xEF/255.0, green: 0x44/255.0, blue: 0x44/255.0), // Z5 red
    ]

    // MARK: - Sport colors (mirror SPORT_CONFIG in ui/client/src/lib/activities.ts)

    static let weightsColor = Color(red: 0x3B / 255.0, green: 0x4A / 255.0, blue: 0x6B / 255.0)   // WEIGHTS  #3b4a6b
    static let badmintonColor = Color(red: 0x2D / 255.0, green: 0x8A / 255.0, blue: 0x4E / 255.0) // BADMINTON #2d8a4e
    static let rideColor = Color(red: 0xC4 / 255.0, green: 0x7A / 255.0, blue: 0x20 / 255.0)      // RIDE     #c47a20
    static let runColor = Color(red: 0xC4 / 255.0, green: 0x40 / 255.0, blue: 0x20 / 255.0)       // RUN      #c44020
    static let otherColor = Color(red: 0x77 / 255.0, green: 0x77 / 255.0, blue: 0x77 / 255.0)     // OTHERS   #777

    // MARK: - Workout type colors (timer palette)

    static let foundationColor      = Color(red: 0x2B / 255.0, green: 0x6C / 255.0, blue: 0xB6 / 255.0) // blue
    static let calisthenicsTimerColor = Color(red: 0x2D / 255.0, green: 0x3A / 255.0, blue: 0x55 / 255.0) // dark blue-gray
    static let recoveryColor        = Color(red: 0x14 / 255.0, green: 0x82 / 255.0, blue: 0x7E / 255.0) // teal
    static let realignColor         = Color(red: 0x6B / 255.0, green: 0x21 / 255.0, blue: 0xA8 / 255.0) // purple

    static func workoutColor(for type: WorkoutType?) -> Color {
        switch type {
        case .foundation:    return foundationColor
        case .calisthenics:  return calisthenicsTimerColor
        case .recovery:      return recoveryColor
        case .realign:       return realignColor
        case nil:            return foundationColor
        }
    }

    static func workoutLabel(for type: WorkoutType?) -> String {
        switch type {
        case .foundation:   return "FOUNDATION"
        case .calisthenics: return "CALISTHENICS"
        case .recovery:     return "RECOVERY"
        case .realign:      return "REALIGN"
        case nil:           return "WORKOUT"
        }
    }

    /// SF Symbol name for a sport type — used in icon circles and grid cards.
    static func sportIcon(for sportType: String) -> String {
        switch sportType {
        case "Badminton":
            return "figure.badminton"
        case "WeightTraining", "Foundation", "TraditionalStrengthTraining", "FunctionalStrengthTraining":
            return "dumbbell.fill"
        case "Ride", "EBikeRide", "Cycling":
            return "figure.outdoor.cycle"
        case "Run", "Running":
            return "figure.run"
        default:
            return "figure.mixed.cardio"
        }
    }

    /// Maps a HealthKit/Strava sport type string to its website badge label + color.
    static func sportBadge(for sportType: String) -> (label: String, color: Color) {
        switch sportType {
        case "Badminton":
            return ("BADMINTON", badmintonColor)
        case "WeightTraining", "Foundation", "TraditionalStrengthTraining", "FunctionalStrengthTraining":
            return ("WEIGHTS", weightsColor)
        case "Ride", "EBikeRide", "Cycling":
            return ("RIDE", rideColor)
        case "Run", "Running":
            return ("RUN", runColor)
        default:
            return ("OTHER", otherColor)
        }
    }
}

// MARK: - Reusable styled components

/// All-caps tracked section header, e.g. "ACTIVITY FEED" — 10pt bold, 2px tracking, gray.
struct SectionHeader: View {
    let title: String

    init(_ title: String) { self.title = title }

    var body: some View {
        Text(title.uppercased())
            .font(.system(size: 11, weight: .bold))
            .kerning(2)
            .foregroundColor(.secondary)
    }
}

/// Sport-type badge: filled color pill with white bold uppercase text, like the
/// website's filter buttons.
struct SportBadge: View {
    let sportType: String

    var body: some View {
        let badge = Theme.sportBadge(for: sportType)
        Text(badge.label)
            .font(.system(size: 9, weight: .bold))
            .kerning(1)
            .foregroundColor(.white)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(badge.color)
            .clipShape(Capsule())
    }
}

/// A single inline stat: value on top (semibold, monospaced digits), tiny gray
/// uppercase label below — matches the website's Duration | Cal | Avg HR | Peak row.
struct StatItem: View {
    let value: String
    let label: String

    var body: some View {
        VStack(alignment: .trailing, spacing: 1) {
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .monospacedDigit()
                .foregroundColor(.primary)
            Text(label.uppercased())
                .font(.system(size: 9, weight: .medium))
                .foregroundColor(.secondary)
        }
    }
}

/// Card container with white background, subtle light gray border, sharp corners.
struct ThemedCard<Content: View>: View {
    var padding: CGFloat = 10
    @ViewBuilder let content: Content

    var body: some View {
        content
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(padding)
            .background(Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadius)
                    .stroke(Theme.cardBorder, lineWidth: 1)
            )
    }
}

/// Full-card press: opacity dimming, no scale (avoids border/edge clipping artifacts).
struct CardPressButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.82 : 1.0)
            .animation(.easeOut(duration: 0.08), value: configuration.isPressed)
    }
}

/// List-row press: muted background flash, no scale (color bar must not clip).
struct RowPressButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .overlay(configuration.isPressed ? Theme.mutedBackground.opacity(0.55) : Color.clear)
            .animation(.easeOut(duration: 0.08), value: configuration.isPressed)
    }
}

/// Primary action button — green fill, white semibold label, soft corners.
struct PrimaryButtonStyle: ButtonStyle {
    var fill: Color = Theme.accentGreen

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(fill.opacity(configuration.isPressed ? 0.8 : 1))
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
    }
}

/// Minimal screen header: large bold title on the system background with a
/// hairline divider underneath. Quiet, aesthetic, iOS-native.
struct BrandHeader: View {
    var title: String = "Coach Phelps"
    var trailing: AnyView? = nil

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .firstTextBaseline) {
                Text(title)
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                Spacer()
                if let trailing { trailing }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 10)

            Divider().opacity(0.5)
        }
        .background(Color(uiColor: .systemBackground))
    }
}

// MARK: - Haptics

/// Lightweight haptics helper — success/error notifications and selection ticks.
enum Haptics {
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }

    static func tap() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
}

// MARK: - Toast

/// Toast payload: message + severity. Identifiable by generation so repeated
/// toasts with the same text still re-trigger.
struct Toast: Equatable {
    enum Kind { case success, error, info }
    let kind: Kind
    let message: String
    var id = UUID()

    var icon: String {
        switch kind {
        case .success: return "checkmark.circle.fill"
        case .error: return "exclamationmark.triangle.fill"
        case .info: return "info.circle.fill"
        }
    }

    var tint: Color {
        switch kind {
        case .success: return Theme.accentGreen
        case .error: return .red
        case .info: return Theme.ink
        }
    }
}

/// Overlay modifier that slides a compact toast down from the top, auto-hides
/// after a few seconds, and fires matching haptics.
struct ToastModifier: ViewModifier {
    @Binding var toast: Toast?

    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if let toast {
                HStack(spacing: 8) {
                    Image(systemName: toast.icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                    Text(toast.message)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.white)
                        .lineLimit(3)
                        .multilineTextAlignment(.leading)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(toast.tint)
                .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadius))
                .shadow(color: .black.opacity(0.15), radius: 8, y: 3)
                .padding(.horizontal, 16)
                .padding(.top, 4)
                .transition(.move(edge: .top).combined(with: .opacity))
                .onTapGesture { withAnimation { self.toast = nil } }
                .task(id: toast.id) {
                    // Errors linger longer so they can actually be read.
                    let seconds: UInt64 = toast.kind == .error ? 6 : 2
                    try? await Task.sleep(nanoseconds: seconds * 1_000_000_000)
                    withAnimation { self.toast = nil }
                }
            }
        }
        .animation(.spring(duration: 0.35), value: toast)
    }
}

extension View {
    /// Presents a toast at the top of this view whenever the binding is non-nil.
    func toast(_ toast: Binding<Toast?>) -> some View {
        modifier(ToastModifier(toast: toast))
    }
}

// MARK: - Skeleton loading

/// Redacts content and adds a gentle pulse while `isLoading` is true — used for
/// stats that arrive after the row/card is already on screen.
struct SkeletonModifier: ViewModifier {
    let isLoading: Bool
    @State private var pulsing = false

    func body(content: Content) -> some View {
        content
            .redacted(reason: isLoading ? .placeholder : [])
            .opacity(isLoading ? (pulsing ? 0.4 : 0.8) : 1)
            .animation(
                isLoading
                    ? .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                    : .default,
                value: pulsing
            )
            .onAppear { if isLoading { pulsing = true } }
            .onChange(of: isLoading) { loading in
                pulsing = loading
            }
    }
}

extension View {
    /// Skeleton placeholder state: redacted + pulsing while loading.
    func skeleton(_ isLoading: Bool) -> some View {
        modifier(SkeletonModifier(isLoading: isLoading))
    }
}
