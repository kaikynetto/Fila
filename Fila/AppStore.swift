import Foundation
import AppKit
import UniformTypeIdentifiers
import AVFoundation

struct SocialAccount: Codable {
    var id: String
    var network: String
    var handle: String
    var label: String? = nil
    var kind: String? = nil
}

struct WorkspaceProfile: Codable {
    var userName: String
    var companyName: String
    var timeZone: String
    var accounts: [SocialAccount]
}

struct PostAttachment: Codable {
    var id: String
    var name: String
    var storageName: String
    var size: Int64
    var mime: String
    var thumbnail: String?
}

struct PlannedPost: Codable {
    var id: String
    var title: String
    var accountId: String
    var network: String
    var format: String
    var caption: String
    var date: String
    var time: String
    var reminderMinutes: Int?
    var status: String
    var attachments: [PostAttachment]
    var createdAt: String
    var updatedAt: String
}

struct WorkspaceState: Codable {
    var version = 1
    var profile: WorkspaceProfile?
    var posts: [PlannedPost] = []
    var trash: [PlannedPost] = []
}

enum FilaError: LocalizedError {
    case message(String)
    var errorDescription: String? {
        switch self { case .message(let message): return message }
    }
}

final class AppStore {
    let root: URL
    let mediaDirectory: URL
    private let stateFile: URL
    private let manager = FileManager.default
    static let networks = Set(["Instagram", "TikTok", "LinkedIn", "Facebook", "YouTube", "X"])

    init(root: URL? = nil) throws {
        self.root = try root ?? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("Fila", isDirectory: true)
        mediaDirectory = self.root.appendingPathComponent("Media", isDirectory: true)
        stateFile = self.root.appendingPathComponent("workspace.json")
        try manager.createDirectory(at: mediaDirectory, withIntermediateDirectories: true)
    }

    func load() throws -> WorkspaceState {
        guard manager.fileExists(atPath: stateFile.path) else { return WorkspaceState() }
        do {
            let state = try JSONDecoder().decode(WorkspaceState.self, from: Data(contentsOf: stateFile))
            try validate(state)
            return state
        } catch {
            throw FilaError.message("Não foi possível ler os dados salvos. Seus arquivos foram preservados. Abra a pasta de dados para recuperar a cópia anterior.")
        }
    }

    func save(_ state: WorkspaceState) throws {
        try validate(state)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(state)
        if manager.fileExists(atPath: stateFile.path) {
            let previous = try Data(contentsOf: stateFile)
            try previous.write(to: root.appendingPathComponent("workspace.previous.json"), options: .atomic)
        }
        try data.write(to: stateFile, options: .atomic)
    }

    func validate(_ state: WorkspaceState) throws {
        guard state.version == 1 else { throw FilaError.message("Esta versão do arquivo não é compatível com o Fila.") }
        guard let profile = state.profile else {
            guard state.posts.isEmpty && state.trash.isEmpty else { throw FilaError.message("Configure seu espaço antes de salvar postagens.") }
            return
        }
        guard !profile.userName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !profile.companyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              TimeZone(identifier: profile.timeZone) != nil,
              !profile.accounts.isEmpty else { throw FilaError.message("Preencha seu nome, a empresa e pelo menos uma rede social.") }
        let accountIds = Set(profile.accounts.map(\.id))
        guard accountIds.count == profile.accounts.count,
              profile.accounts.allSatisfy({ UUID(uuidString: $0.id) != nil && Self.networks.contains($0.network) && !$0.handle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && ($0.kind == nil || ["Empresa", "Dark"].contains($0.kind!)) }) else { throw FilaError.message("Confira os perfis das redes sociais.") }
        let all = state.posts + state.trash
        guard Set(all.map(\.id)).count == all.count else { throw FilaError.message("Há postagens duplicadas no arquivo.") }
        for post in all {
            guard UUID(uuidString: post.id) != nil, !post.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let account = profile.accounts.first(where: { $0.id == post.accountId }), account.network == post.network,
                  ["Planejado", "Rascunho", "Publicado"].contains(post.status),
                  post.reminderMinutes == nil || [0, 5, 15, 30, 60].contains(post.reminderMinutes!),
                  Self.scheduledDate(post, timeZone: profile.timeZone) != nil else { throw FilaError.message("Confira o título, a rede, a data e o horário das postagens.") }
            for file in post.attachments {
                guard UUID(uuidString: file.id) != nil, file.storageName.hasPrefix(file.id + "."),
                      file.storageName == URL(fileURLWithPath: file.storageName).lastPathComponent,
                      !file.storageName.contains(".."), file.size >= 0 else { throw FilaError.message("Um arquivo da postagem não é válido.") }
            }
        }
    }

    static func scheduledDate(_ post: PlannedPost, timeZone: String) -> Date? {
        let dates = post.date.split(separator: "-").compactMap { Int($0) }
        let times = post.time.split(separator: ":").compactMap { Int($0) }
        guard dates.count == 3, times.count == 2, (0...23).contains(times[0]), (0...59).contains(times[1]), let zone = TimeZone(identifier: timeZone) else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        let parts = DateComponents(timeZone: zone, year: dates[0], month: dates[1], day: dates[2], hour: times[0], minute: times[1], second: 0)
        guard let date = calendar.date(from: parts) else { return nil }
        let roundtrip = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        guard roundtrip.year == parts.year, roundtrip.month == parts.month, roundtrip.day == parts.day, roundtrip.hour == parts.hour, roundtrip.minute == parts.minute else { return nil }
        return date
    }

    func importFiles(_ urls: [URL]) async throws -> [PostAttachment] {
        var files: [PostAttachment] = []
        var copied: [URL] = []
        do {
            for source in urls {
                let scoped = source.startAccessingSecurityScopedResource()
                defer { if scoped { source.stopAccessingSecurityScopedResource() } }
                let values = try source.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
                guard values.isRegularFile == true,
                      let type = UTType(filenameExtension: source.pathExtension),
                      type.conforms(to: .image) || type.conforms(to: .movie) || type.conforms(to: .pdf) else { throw FilaError.message("Escolha imagens, vídeos ou PDFs para a postagem.") }
                let id = UUID().uuidString.lowercased()
                let ext = source.pathExtension.lowercased().filter { $0.isLetter || $0.isNumber }
                guard !ext.isEmpty else { throw FilaError.message("Este arquivo não tem uma extensão reconhecida.") }
                let destination = mediaDirectory.appendingPathComponent(id + "." + ext)
                try manager.copyItem(at: source, to: destination)
                copied.append(destination)
                var thumbnail: String?
                if type.conforms(to: .image), let image = NSImage(contentsOf: destination) {
                    thumbnail = Self.thumbnail(image)
                } else if type.conforms(to: .movie) {
                    let generator = AVAssetImageGenerator(asset: AVURLAsset(url: destination))
                    generator.appliesPreferredTrackTransform = true
                    generator.maximumSize = CGSize(width: 500, height: 500)
                    if let frame = (try? await generator.image(at: .zero))?.image {
                        thumbnail = Self.thumbnail(NSImage(cgImage: frame, size: .zero))
                    }
                }
                files.append(PostAttachment(id: id, name: source.lastPathComponent, storageName: destination.lastPathComponent,
                                            size: Int64(values.fileSize ?? 0), mime: type.preferredMIMEType ?? "application/octet-stream", thumbnail: thumbnail))
            }
            return files
        } catch {
            for file in copied { try? manager.removeItem(at: file) }
            throw error
        }
    }

    static func thumbnail(_ image: NSImage) -> String? {
        guard image.size.width > 0, image.size.height > 0 else { return nil }
        let scale = min(1, 500 / max(image.size.width, image.size.height))
        let size = NSSize(width: max(1, image.size.width * scale), height: max(1, image.size.height * scale))
        guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(size.width), pixelsHigh: Int(size.height), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0) else { return nil }
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
        image.draw(in: NSRect(origin: .zero, size: size), from: .zero, operation: .copy, fraction: 1)
        NSGraphicsContext.restoreGraphicsState()
        guard let data = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.76]) else { return nil }
        return "data:image/jpeg;base64," + data.base64EncodedString()
    }

    func attachmentURL(_ storageName: String) throws -> URL {
        guard storageName == URL(fileURLWithPath: storageName).lastPathComponent,
              !storageName.contains(".."), let prefix = storageName.split(separator: ".").first,
              UUID(uuidString: String(prefix)) != nil else { throw FilaError.message("Arquivo inválido.") }
        let url = mediaDirectory.appendingPathComponent(storageName)
        guard manager.fileExists(atPath: url.path) else { throw FilaError.message("Este arquivo não está disponível no Mac.") }
        return url
    }
}
