// Gera assets/icon-1024.png (fundo transparente) — squircle preto com ".MD".
// Uso: swift assets/gen-icon.swift
import AppKit

let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()

guard let ctx = NSGraphicsContext.current?.cgContext else { exit(1) }
ctx.clear(CGRect(origin: .zero, size: CGSize(width: 1024, height: 1024)))

// Squircle preto com leve gradiente
let rect = NSRect(x: 100, y: 100, width: 824, height: 824)
let squircle = NSBezierPath(roundedRect: rect, xRadius: 186, yRadius: 186)
squircle.addClip()
let gradient = NSGradient(
  starting: NSColor(calibratedRed: 0.11, green: 0.098, blue: 0.09, alpha: 1),
  ending: NSColor(calibratedRed: 0.047, green: 0.039, blue: 0.035, alpha: 1)
)
gradient?.draw(in: rect, angle: -75)

// Texto ".MD"
let cream = NSColor(calibratedRed: 0.965, green: 0.957, blue: 0.933, alpha: 1)
let terracotta = NSColor(calibratedRed: 0.737, green: 0.294, blue: 0.153, alpha: 1)
let font = NSFont(name: "Iowan Old Style Bold", size: 300)
  ?? NSFont(name: "Georgia-Bold", size: 300)
  ?? NSFont.boldSystemFont(ofSize: 300)

let label = NSMutableAttributedString()
label.append(NSAttributedString(string: ".", attributes: [.font: font, .foregroundColor: terracotta]))
label.append(NSAttributedString(string: "MD", attributes: [.font: font, .foregroundColor: cream, .kern: -6]))
let textSize = label.size()
label.draw(at: NSPoint(x: (1024 - textSize.width) / 2, y: (1024 - textSize.height) / 2 + 40))

// Barra terracota
let bar = NSBezierPath(roundedRect: NSRect(x: 362, y: 280, width: 300, height: 22), xRadius: 11, yRadius: 11)
terracotta.setFill()
bar.fill()

image.unlockFocus()

guard
  let tiff = image.tiffRepresentation,
  let rep = NSBitmapImageRep(data: tiff),
  let png = rep.representation(using: .png, properties: [:])
else { exit(1) }

let out = URL(fileURLWithPath: "assets/icon-1024.png")
try? png.write(to: out)
print("ok: \(out.path)")
