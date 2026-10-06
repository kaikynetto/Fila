import AppKit

let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let samples: [(String, String, NSColor)] = [
    ("bastidores", "O lado\nde dentro.", NSColor(srgbRed: 0.16, green: 0.27, blue: 0.38, alpha: 1)),
    ("nova-forma", "uma nova\nforma.", NSColor(srgbRed: 0.53, green: 0.38, blue: 0.28, alpha: 1)),
    ("processo", "ideia.\nprocesso.\nforma.", NSColor(srgbRed: 0.20, green: 0.28, blue: 0.24, alpha: 1)),
    ("detalhes", "nos\ndetalhes.", NSColor(srgbRed: 0.46, green: 0.42, blue: 0.34, alpha: 1))
]
for (name, title, color) in samples {
    let image = NSImage(size: NSSize(width: 1080, height: 1350))
    image.lockFocus()
    color.setFill(); NSRect(x: 0, y: 0, width: 1080, height: 1350).fill()
    NSColor(srgbRed: 0.78, green: 0.80, blue: 0.76, alpha: 0.6).setFill()
    NSBezierPath(ovalIn: NSRect(x: 740, y: -180, width: 700, height: 1100)).fill()
    let cream = NSColor(srgbRed: 0.93, green: 0.91, blue: 0.84, alpha: 1)
    let text: [NSAttributedString.Key: Any] = [.font: NSFont(name: "Georgia", size: 136)!, .foregroundColor: cream]
    (title as NSString).draw(in: NSRect(x: 85, y: 500, width: 900, height: 570), withAttributes: text)
    ("lume / studio" as NSString).draw(at: NSPoint(x: 85, y: 1230), withAttributes: [.font: NSFont.systemFont(ofSize: 30), .foregroundColor: cream])
    ("Um recorte do nosso mundo." as NSString).draw(at: NSPoint(x: 85, y: 100), withAttributes: [.font: NSFont.systemFont(ofSize: 24), .foregroundColor: cream])
    image.unlockFocus()
    let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
    try bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent(name + ".png"))
}
