import Foundation

@main
struct NativeStoreTests {
    static func main() async throws {
        let root = URL(fileURLWithPath: "/private/tmp/Fila-NativeTests-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: root) }
        let store = try AppStore(root: root)
        let account = SocialAccount(id: UUID().uuidString, network: "Instagram", handle: "@studiolume")
        let profile = WorkspaceProfile(userName: "Ana", companyName: "Lume", timeZone: "America/Sao_Paulo", accounts: [account])
        var state = WorkspaceState(profile: profile)
        try store.save(state)
        let savedProfile = try AppStore(root: root).load().profile
        precondition(savedProfile?.companyName == "Lume", "O perfil deve sobreviver a outra instância do app.")
        let post = PlannedPost(id: UUID().uuidString, title: "Bastidores", accountId: account.id, network: "Instagram", format: "Post", caption: "Legenda", date: "2027-01-01", time: "00:05", reminderMinutes: 15, status: "Planejado", attachments: [], createdAt: "2026-10-06T00:00:00Z", updatedAt: "2026-10-06T00:00:00Z")
        state.posts = [post]
        try store.save(state)
        let savedPosts = try AppStore(root: root).load().posts
        precondition(savedPosts.first?.title == "Bastidores", "A postagem precisa ser persistida.")
        precondition(FileManager.default.fileExists(atPath: root.appendingPathComponent("workspace.previous.json").path), "Uma versão anterior deve ser preservada.")
        let schedule = AppStore.scheduledDate(post, timeZone: profile.timeZone)!
        precondition(ISO8601DateFormatter().string(from: schedule) == "2027-01-01T03:05:00Z", "O horário deve respeitar o fuso.")
        var invalid = post; invalid.date = "2027-02-31"
        precondition(AppStore.scheduledDate(invalid, timeZone: "UTC") == nil)
        state.posts = [post, post]
        do { try store.save(state); fatalError("Uma postagem duplicada não pode ser salva.") } catch is FilaError {}
        let preserved = try store.load()
        precondition(preserved.posts.count == 1, "Uma gravação inválida não pode sobrescrever o arquivo.")
        do { _ = try store.attachmentURL("../../workspace.json"); fatalError("O acesso fora da pasta de mídia deve ser recusado.") } catch is FilaError {}
        let fixture = root.appendingPathComponent("original.txt")
        try "Um arquivo sem formato de mídia".write(to: fixture, atomically: true, encoding: .utf8)
        do { _ = try await store.importFiles([fixture]); fatalError("Arquivos não suportados devem ser recusados.") } catch is FilaError {}
        precondition(FileManager.default.fileExists(atPath: fixture.path), "O original precisa ser preservado.")
        let source = URL(fileURLWithPath: "Web/public/Examples/bastidores.png")
        let imported = try await store.importFiles([source])
        precondition(imported.count == 1 && imported[0].thumbnail != nil, "A importação deve criar uma miniatura real.")
        let copy = try store.attachmentURL(imported[0].storageName)
        let copiedBytes = try Data(contentsOf: copy), originalBytes = try Data(contentsOf: source)
        precondition(copiedBytes == originalBytes && FileManager.default.fileExists(atPath: source.path), "A cópia deve preservar o arquivo original.")
        let primary = SocialAccount(id: UUID().uuidString, network: "TikTok", handle: "@zenvo", label: "Zenvo principal", kind: "Empresa")
        let dark = SocialAccount(id: UUID().uuidString, network: "TikTok", handle: "@zenvo.cortes", label: "Cortes", kind: "Dark")
        state = preserved
        state.profile?.accounts += [primary, dark]
        var second = post
        second.id = UUID().uuidString; second.accountId = dark.id; second.network = "TikTok"; second.format = "Vídeo"
        state.posts.append(second)
        try store.save(state)
        let multiple = try AppStore(root: root).load()
        precondition(multiple.profile?.accounts.filter { $0.network == "TikTok" }.count == 2)
        precondition(multiple.profile?.accounts.first { $0.id == dark.id }?.kind == "Dark")
        precondition(multiple.posts.last?.accountId == dark.id, "Cada postagem deve continuar ligada à conta exata.")
        print("NativeStoreTests: persistência, backup, validação, fuso e limites de arquivo passaram.")
    }
}
