import AppKit
import Foundation

let root = URL(fileURLWithPath: CommandLine.arguments[1])
let iconset = root.appendingPathComponent(".build/Fila.iconset")
try FileManager.default.createDirectory(at: iconset, withIntermediateDirectories: true)
func draw(_ size: Int) -> Data {
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let scale = CGFloat(size) / 1024
    let transform = NSAffineTransform(); transform.scale(by: scale); transform.concat()
    let tile = NSBezierPath(roundedRect: NSRect(x: 76, y: 76, width: 872, height: 872), xRadius: 196, yRadius: 196)
    NSShadow().set()
    NSGradient(starting: NSColor(srgbRed: 0.14, green: 0.15, blue: 0.19, alpha: 1), ending: NSColor(srgbRed: 0.055, green: 0.058, blue: 0.07, alpha: 1))!.draw(in: tile, angle: -90)
    NSColor(white: 1, alpha: 0.12).setStroke(); tile.lineWidth = 2; tile.stroke()
    func card(_ x: CGFloat, _ y: CGFloat, _ alpha: CGFloat) {
        let path = NSBezierPath(roundedRect: NSRect(x: x, y: y, width: 480, height: 252), xRadius: 42, yRadius: 42)
        NSColor(srgbRed: 0.54, green: 0.69, blue: 0.88, alpha: alpha).setFill(); path.fill()
        NSColor(white: 1, alpha: 0.12).setStroke(); path.lineWidth = 2; path.stroke()
    }
    card(272, 244, 0.32); card(272, 302, 0.55); card(272, 360, 1)
    let check = NSBezierPath(); check.move(to: NSPoint(x: 323, y: 489)); check.line(to: NSPoint(x: 348, y: 464)); check.line(to: NSPoint(x: 397, y: 514)); check.lineWidth = 19; check.lineCapStyle = .round; check.lineJoinStyle = .round
    NSColor(srgbRed: 0.08, green: 0.13, blue: 0.2, alpha: 1).setStroke(); check.stroke()
    for (y, width) in [(CGFloat(496), CGFloat(229)), (CGFloat(446), CGFloat(160))] {
        NSColor(srgbRed: 0.08, green: 0.13, blue: 0.2, alpha: y == 496 ? 0.8 : 0.35).setFill()
        NSBezierPath(roundedRect: NSRect(x: 451, y: y, width: width, height: 17), xRadius: 8, yRadius: 8).fill()
    }
    NSGraphicsContext.restoreGraphicsState()
    rep.size = NSSize(width: size, height: size)
    return rep.representation(using: .png, properties: [:])!
}
for size in [16,32,128,256,512] {
    try draw(size).write(to: iconset.appendingPathComponent("icon_\(size)x\(size).png"))
    try draw(size*2).write(to: iconset.appendingPathComponent("icon_\(size)x\(size)@2x.png"))
}
try draw(1024).write(to: root.appendingPathComponent("docs/icon.png"))
