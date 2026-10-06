import Foundation
import UserNotifications
import AppKit

@MainActor
final class NotificationService: NSObject, UNUserNotificationCenterDelegate {
    private let center = UNUserNotificationCenter.current()
    var onOpenPost: ((String) -> Void)?
    var openedPostId: String?
    private var syncTask: Task<[String], Never>?

    override init() {
        super.init()
        center.delegate = self
    }

    func status() async -> String {
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional: return "authorized"
        case .denied: return "denied"
        default: return "notDetermined"
        }
    }

    func requestPermission() async throws -> String {
        _ = try await center.requestAuthorization(options: [.alert, .sound])
        return await status()
    }

    func sync(_ state: WorkspaceState) async -> [String] {
        let previous = syncTask
        let next = Task { @MainActor in
            if let previous { _ = await previous.value }
            return await reconcile(state)
        }
        syncTask = next
        return await next.value
    }

    private func reconcile(_ state: WorkspaceState) async -> [String] {
        center.removeAllPendingNotificationRequests()
        guard let profile = state.profile, await status() == "authorized" else { return [] }
        var errors: [String] = []
        for post in state.posts where post.status == "Planejado" {
            guard let minutes = post.reminderMinutes,
                  let scheduled = AppStore.scheduledDate(post, timeZone: profile.timeZone) else { continue }
            let reminder = scheduled.addingTimeInterval(Double(-minutes * 60))
            guard reminder > Date() else { continue }
            var calendar = Calendar(identifier: .gregorian)
            calendar.timeZone = TimeZone(identifier: profile.timeZone)!
            var components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: reminder)
            components.timeZone = calendar.timeZone
            let content = UNMutableNotificationContent()
            content.title = minutes == 0 ? "Hora de postar" : "Sua postagem está chegando"
            let account = profile.accounts.first { $0.id == post.accountId }
            let accountName = account?.label ?? account?.handle ?? post.network
            content.body = "\(post.title) · \(accountName) (\(post.network)), às \(post.time)"
            content.sound = .default
            content.userInfo = ["postId": post.id]
            let request = UNNotificationRequest(identifier: post.id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false))
            do { try await center.add(request) }
            catch { errors.append(post.id) }
        }
        return errors
    }

    func pending() async -> Int { await center.pendingNotificationRequests().count }

    func test() async throws {
        guard await status() == "authorized" else { throw FilaError.message("Ative as notificações do Fila para testar o lembrete.") }
        let content = UNMutableNotificationContent()
        content.title = "Os lembretes do Fila estão prontos"
        content.body = "É assim que seu Mac vai avisar quando chegar a hora de postar."
        content.sound = .default
        try await center.add(UNNotificationRequest(identifier: "fila-notification-test", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)))
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        if let id = response.notification.request.content.userInfo["postId"] as? String {
            Task { @MainActor in
                self.openedPostId = id
                self.onOpenPost?(id)
                NSApp.activate(ignoringOtherApps: true)
                NSApp.windows.first?.makeKeyAndOrderFront(nil)
            }
        }
        completionHandler()
    }
}
