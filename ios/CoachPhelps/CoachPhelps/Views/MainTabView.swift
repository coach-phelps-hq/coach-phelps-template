import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authManager: GitHubAuthManager
    @EnvironmentObject var syncManager: HealthKitSyncManager
    @EnvironmentObject var workoutService: WorkoutService

    var body: some View {
        TabView {
            SyncStatusView()
                .tabItem {
                    Label("Sync", systemImage: "arrow.triangle.2.circlepath")
                }

            ActivityListView()
                .tabItem {
                    Label("Activities", systemImage: "chart.bar.doc.horizontal")
                }

            CoachingInsightsView()
                .tabItem {
                    Label("Insights", systemImage: "chart.xyaxis.line")
                }

            WorkoutListView()
                .environmentObject(workoutService)
                .tabItem {
                    Label("Timer", systemImage: "timer")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
        .tint(Theme.accentGreen)
    }
}
