import SwiftUI
import WebKit

@main
struct FilaApp: App {
    var body: some Scene {
        Window("Fila", id: "main") {
            FilaWebView()
                .frame(minWidth: 1080, minHeight: 720)
                .background(Color(red: 15 / 255, green: 14 / 255, blue: 13 / 255))
                .preferredColorScheme(.dark)
        }
        .windowStyle(.titleBar)
        .defaultSize(width: 1280, height: 840)
        .commands {
            if ProcessInfo.processInfo.arguments.contains("--demo") {
                CommandMenu("Demonstração") {
                    Button("Carregar exemplo") { NativeBridge.current?.loadDemo() }
                    Button("Testar notificação no Mac") { NativeBridge.current?.testRealNotification() }
                    Button("Salvar captura…") { NativeBridge.current?.capture() }
                        .keyboardShortcut("s", modifiers: [.command, .shift])
                }
            }
        }
    }
}

struct FilaWebView: NSViewRepresentable {
    func makeCoordinator() -> NativeBridge {
        let arguments = ProcessInfo.processInfo.arguments
        let demo = arguments.contains("--demo")
        var root: URL?
        if let index = arguments.firstIndex(of: "--data-dir"), arguments.indices.contains(index + 1) {
            root = URL(fileURLWithPath: arguments[index + 1], isDirectory: true)
        } else if demo {
            root = try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("Fila-Demo", isDirectory: true)
        }
        do { return NativeBridge(store: try AppStore(root: root), demo: demo) }
        catch { fatalError("Não foi possível abrir a pasta de dados do Fila: \(error.localizedDescription)") }
    }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.suppressesIncrementalRendering = true
        configuration.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "fila")
        configuration.setURLSchemeHandler(context.coordinator, forURLScheme: "fila-media")
        let view = FileDropWebView(frame: .zero, configuration: configuration)
        context.coordinator.webView = view
        view.registerForDraggedTypes([.fileURL])
        view.didDropFiles = { [weak bridge = context.coordinator] urls in bridge?.dropFiles(urls) }
        view.underPageBackgroundColor = NSColor(srgbRed: 15 / 255, green: 14 / 255, blue: 13 / 255, alpha: 1)
        view.allowsBackForwardNavigationGestures = false
        if let page = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            view.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
        }
        return view
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}
}
