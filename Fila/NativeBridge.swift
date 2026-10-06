import AppKit
import WebKit
import UniformTypeIdentifiers

@MainActor
final class NativeBridge: NSObject, WKScriptMessageHandlerWithReply, WKURLSchemeHandler {
    let store: AppStore
    let notifications = NotificationService()
    let demo: Bool
    weak var webView: WKWebView?
    private var captureNumber = 0
    static weak var current: NativeBridge?

    init(store: AppStore, demo: Bool) {
        self.store = store
        self.demo = demo
        super.init()
        Self.current = self
        notifications.onOpenPost = { [weak self] id in self?.emit("fila-open-post", value: id) }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame, message.webView?.url?.isFileURL == true,
              let body = message.body as? [String: Any], let action = body["action"] as? String else {
            replyHandler(nil, "Esta solicitação não é válida.")
            return
        }
        Task { @MainActor in
            do { replyHandler(try await handle(action, payload: body["payload"] as? [String: Any] ?? [:]), nil) }
            catch { replyHandler(nil, error.localizedDescription) }
        }
    }

    func handle(_ action: String, payload: [String: Any]) async throws -> Any {
        switch action {
        case "load":
            let state = try store.load()
            if !demo { _ = await notifications.sync(state) }
            return try await response(state)
        case "save":
            let data = try JSONSerialization.data(withJSONObject: payload)
            let state = try JSONDecoder().decode(WorkspaceState.self, from: data)
            try store.save(state)
            let failed = demo ? [] : await notifications.sync(state)
            var result = try await response(state)
            result["notificationErrors"] = failed
            return result
        case "importFiles":
            let panel = NSOpenPanel()
            panel.title = "Arquivos da postagem"
            panel.message = "Escolha imagens, vídeos ou PDFs. O Fila guarda uma cópia para esta postagem."
            panel.allowedContentTypes = [.image, .movie, .pdf]
            panel.allowsMultipleSelection = true
            panel.canChooseDirectories = false
            let result = await withCheckedContinuation { continuation in panel.begin { continuation.resume(returning: $0) } }
            guard result == .OK else { return ["files": []] }
            let files = try await importFiles(panel.urls)
            return ["files": try object(files)]
        case "demoFiles":
            guard demo else { throw FilaError.message("Esta ação é exclusiva da demonstração.") }
            let urls = ["bastidores", "nova-forma", "processo", "detalhes"].compactMap { Bundle.main.url(forResource: $0, withExtension: "png", subdirectory: "Web/Examples") }
            return ["files": try object(await importFiles(urls))]
        case "openFile", "revealFile", "exportFile":
            guard let storageName = payload["storageName"] as? String else { throw FilaError.message("Escolha um arquivo.") }
            let url = try store.attachmentURL(storageName)
            if action == "openFile" {
                guard NSWorkspace.shared.open(url) else { throw FilaError.message("Não foi possível abrir este arquivo.") }
            } else if action == "revealFile" {
                NSWorkspace.shared.activateFileViewerSelecting([url])
            } else {
                let panel = NSSavePanel()
                panel.title = "Salvar uma cópia do arquivo"
                panel.nameFieldStringValue = (payload["name"] as? String ?? url.lastPathComponent).replacingOccurrences(of: "/", with: "-")
                let result = await withCheckedContinuation { continuation in panel.begin { continuation.resume(returning: $0) } }
                if result == .OK, let destination = panel.url {
                    let data = try Data(contentsOf: url)
                    try data.write(to: destination, options: .atomic)
                }
            }
            return ["ok": true]
        case "copyText":
            guard let text = payload["text"] as? String else { throw FilaError.message("Nada para copiar.") }
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(text, forType: .string)
            return ["ok": true]
        case "openProfile":
            guard let raw = payload["url"] as? String, let url = URL(string: raw), url.scheme == "https",
                  let host = url.host?.lowercased(), ["instagram.com", "www.instagram.com", "tiktok.com", "www.tiktok.com", "linkedin.com", "www.linkedin.com", "facebook.com", "www.facebook.com", "youtube.com", "www.youtube.com", "x.com", "www.x.com"].contains(host) else { throw FilaError.message("O endereço deste perfil não é válido.") }
            NSWorkspace.shared.open(url)
            return ["ok": true]
        case "notificationPermission":
            _ = try await notifications.requestPermission()
            if !demo { _ = await notifications.sync(try store.load()) }
            return ["status": await notifications.status(), "pending": await notifications.pending()]
        case "notificationStatus":
            return ["status": await notifications.status(), "pending": await notifications.pending()]
        case "notificationTest":
            guard !demo else { return ["ok": true] }
            try await notifications.test()
            return ["ok": true]
        case "openSystemSettings":
            NSWorkspace.shared.open(URL(fileURLWithPath: "/System/Applications/System Settings.app"))
            return ["ok": true]
        case "revealData":
            NSWorkspace.shared.activateFileViewerSelecting([store.root])
            return ["ok": true]
        case "exportData":
            let panel = NSSavePanel()
            panel.title = "Exportar planejamento"
            panel.allowedContentTypes = [.json]
            panel.nameFieldStringValue = "fila-planejamento.json"
            let result = await withCheckedContinuation { continuation in panel.begin { continuation.resume(returning: $0) } }
            if result == .OK, let url = panel.url {
                let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
                try encoder.encode(store.load()).write(to: url, options: .atomic)
            }
            return ["saved": result == .OK]
        default: throw FilaError.message("Esta ação não está disponível.")
        }
    }

    private func response(_ state: WorkspaceState) async throws -> [String: Any] {
        var result: [String: Any] = ["state": try object(state), "demo": demo,
                                   "notifications": await notifications.status(),
                                   "pending": await notifications.pending()]
        if let id = notifications.openedPostId { result["openPostId"] = id; notifications.openedPostId = nil }
        return result
    }

    private func object<T: Encodable>(_ value: T) throws -> Any { try JSONSerialization.jsonObject(with: JSONEncoder().encode(value)) }

    func importFiles(_ urls: [URL]) async throws -> [PostAttachment] {
        let store = self.store
        return try await Task.detached(priority: .userInitiated) { try await store.importFiles(urls) }.value
    }

    func dropFiles(_ urls: [URL]) {
        Task { @MainActor in
            do { emit("fila-files", value: try object(await importFiles(urls))) }
            catch { emit("fila-error", value: error.localizedDescription) }
        }
    }

    func emit(_ name: String, value: Any) {
        guard let data = try? JSONSerialization.data(withJSONObject: ["name": name, "detail": value]), let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("(() => { const event = \(json); window.dispatchEvent(new CustomEvent(event.name, { detail: event.detail })); })()")
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        do {
            guard let requestURL = urlSchemeTask.request.url, requestURL.host == "media" else { throw FilaError.message("Arquivo inválido.") }
            let url = try store.attachmentURL(requestURL.lastPathComponent)
            let mime = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
            let data = try Data(contentsOf: url)
            urlSchemeTask.didReceive(URLResponse(url: requestURL, mimeType: mime, expectedContentLength: data.count, textEncodingName: nil))
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch { urlSchemeTask.didFailWithError(error) }
    }
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    func capture() {
        guard demo, let view = webView else { return }
        let arguments = ProcessInfo.processInfo.arguments
        captureNumber += 1
        let number = captureNumber
        view.takeSnapshot(with: nil) { image, error in
            guard let image, let tiff = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let data = bitmap.representation(using: .png, properties: [:]) else { return }
            let panel = NSSavePanel()
            panel.title = "Salvar captura do Fila"
            panel.allowedContentTypes = [.png]
            panel.nameFieldStringValue = String(format: "capture-%02d.png", number)
            if let index = arguments.firstIndex(of: "--capture-dir"), arguments.indices.contains(index + 1) { panel.directoryURL = URL(fileURLWithPath: arguments[index + 1], isDirectory: true) }
            panel.begin { result in
                if result == .OK, let url = panel.url { try? data.write(to: url, options: .atomic) }
            }
        }
    }

    func loadDemo() {
        guard demo else { return }
        emit("fila-demo-seed", value: [:])
    }

    func testRealNotification() {
        guard demo else { return }
        Task { @MainActor in
            do {
                _ = try await notifications.requestPermission()
                try await notifications.test()
                emit("fila-error", value: "Um lembrete de teste chegará em 5 segundos.")
            } catch { emit("fila-error", value: error.localizedDescription) }
        }
    }
}

final class FileDropWebView: WKWebView {
    var didDropFiles: (([URL]) -> Void)?
    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        if sender.draggingPasteboard.canReadObject(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) { return .copy }
        return super.draggingEntered(sender)
    }
    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        if let urls = sender.draggingPasteboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL], !urls.isEmpty {
            didDropFiles?(urls)
            return true
        }
        return super.performDragOperation(sender)
    }
}
