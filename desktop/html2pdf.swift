// Conversor HTML -> PDF nativo (WebKit + PDFKit), embutido no app.
// Uso: html2pdf <entrada.html> <saida.pdf>
//
// Renderiza com o MESMO motor do app (WKWebView) e gera um PDF A4 paginado e
// fiel ao documento na tela. Em vez do NSPrintOperation (que gera milhares de
// paginas quebradas em modo headless), usa WKWebView.createPDF por fatia e
// compoe cada fatia numa folha A4 com margens, escolhendo os cortes nas
// fronteiras dos blocos (nunca no meio de um paragrafo ou tabela quando cabe).
import PDFKit
import WebKit

guard CommandLine.arguments.count == 3 else {
  FileHandle.standardError.write("uso: html2pdf <entrada.html> <saida.pdf>\n".data(using: .utf8)!)
  exit(2)
}
let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])

func fail(_ msg: String) -> Never {
  FileHandle.standardError.write("\(msg)\n".data(using: .utf8)!)
  exit(1)
}

// A4 em pontos (1 ponto = 1 px CSS no render do WebKit com pageScale 1).
let pageW: CGFloat = 595.28
let pageH: CGFloat = 841.89
let margin: CGFloat = 51.0
let contentW = pageW - margin * 2
let contentH = pageH - margin * 2

// Largura de design: a coluna de texto do app (.doc-prose = max-w-[880px] menos
// px-14 dos dois lados = 880 - 112 = 768px). Renderizamos o documento NESSA largura
// para preservar exatamente as proporcoes do app (quebras de linha, tamanho relativo
// de fonte) e depois reduzimos cada fatia por `scale` para caber na coluna do A4.
// Sem isso, o conteudo era esticado para 493px com fonte de 17.5pt — coluna estreita
// e fonte gigante no papel.
let designWidth: CGFloat = 768.0
let scale = contentW / designWidth
// Altura de uma pagina medida em px de design (apos escalar, ocupa contentH no papel).
let pageContentPx = contentH / scale

let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

let webView = WKWebView(
  frame: NSRect(x: 0, y: 0, width: designWidth, height: pageContentPx),
  configuration: WKWebViewConfiguration()
)

// Ajusta o layout para a largura de conteudo do A4 (sem centralizar nem padding;
// as margens vem da composicao em PDFKit) e mede as fronteiras de bloco.
let MEASURE_JS = """
(function () {
  var b = document.body;
  b.style.maxWidth = 'none';
  b.style.width = \(designWidth) + 'px';
  b.style.margin = '0';
  b.style.padding = '0';
  var pageContent = \(pageContentPx);
  var total = Math.ceil(b.scrollHeight);
  // Fronteiras seguras de corte: a base de cada filho direto do body.
  var breaks = [0];
  var kids = b.children;
  for (var i = 0; i < kids.length; i++) {
    var r = kids[i].getBoundingClientRect();
    var bottom = Math.ceil(r.bottom + window.scrollY);
    if (bottom > 0) breaks.push(bottom);
  }
  breaks.push(total);
  return JSON.stringify({ total: total, pageContent: pageContent, breaks: breaks });
})();
"""

/// Calcula os intervalos [inicio, fim) de cada pagina, cortando em fronteiras de
/// bloco. Blocos maiores que uma pagina sao divididos em pedaços do tamanho da pagina.
func computePages(total: CGFloat, pageContent: CGFloat, breaks: [CGFloat]) -> [(CGFloat, CGFloat)] {
  let sorted = breaks.sorted()
  var pages: [(CGFloat, CGFloat)] = []
  var start: CGFloat = 0
  var guardCount = 0
  while start < total - 0.5 {
    guardCount += 1
    if guardCount > 5000 { break }
    let limit = start + pageContent
    // Maior fronteira que cabe na pagina e avança a partir de start.
    var end: CGFloat = 0
    for b in sorted where b > start + 1 && b <= limit + 0.5 {
      end = b
    }
    if end <= start {
      // Nenhuma fronteira coube: bloco mais alto que a pagina, corte rígido.
      end = min(limit, total)
    }
    pages.append((start, end))
    start = end
  }
  if pages.isEmpty { pages.append((0, min(pageContent, total))) }
  return pages
}

final class Delegate: NSObject, WKNavigationDelegate {
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
      webView.evaluateJavaScript(MEASURE_JS) { result, err in
        guard let jsonStr = result as? String,
          let data = jsonStr.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let total = (obj["total"] as? NSNumber)?.doubleValue,
          let pageContent = (obj["pageContent"] as? NSNumber)?.doubleValue,
          let breaksArr = obj["breaks"] as? [NSNumber]
        else {
          fail("falha ao medir o documento: \(String(describing: err))")
        }
        let breaks = breaksArr.map { CGFloat($0.doubleValue) }
        let pages = computePages(
          total: CGFloat(total), pageContent: CGFloat(pageContent), breaks: breaks)
        // Reforça o frame na largura de design apos o ajuste de layout.
        webView.frame = NSRect(x: 0, y: 0, width: designWidth, height: CGFloat(total))
        renderPages(webView: webView, pages: pages, index: 0, out: [])
      }
    }
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    fail("falha ao carregar: \(error.localizedDescription)")
  }
  func webView(
    _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error
  ) {
    fail("falha provisoria: \(error.localizedDescription)")
  }
}

/// Renderiza cada fatia com createPDF (assincrono, encadeado) e acumula os PDFs.
func renderPages(webView: WKWebView, pages: [(CGFloat, CGFloat)], index: Int, out: [Data]) {
  if index >= pages.count {
    compose(slices: out, pages: pages)
    return
  }
  let (start, end) = pages[index]
  let config = WKPDFConfiguration()
  config.rect = CGRect(x: 0, y: start, width: designWidth, height: end - start)
  webView.createPDF(configuration: config) { result in
    switch result {
    case .success(let data):
      renderPages(webView: webView, pages: pages, index: index + 1, out: out + [data])
    case .failure(let e):
      fail("createPDF falhou na pagina \(index + 1): \(e.localizedDescription)")
    }
  }
}

/// Compoe cada fatia numa folha A4 com margens e grava o PDF final.
func compose(slices: [Data], pages: [(CGFloat, CGFloat)]) {
  guard let consumer = CGDataConsumer(url: outputURL as CFURL) else {
    fail("nao foi possivel criar o PDF de saida")
  }
  var mediaBox = CGRect(x: 0, y: 0, width: pageW, height: pageH)
  guard let ctx = CGContext(consumer: consumer, mediaBox: &mediaBox, nil) else {
    fail("nao foi possivel criar o contexto PDF")
  }
  for (i, data) in slices.enumerated() {
    guard let doc = PDFDocument(data: data), let page = doc.page(at: 0) else { continue }
    // Altura da fatia em px de design; ao escalar por `scale` vira a altura no papel.
    let sliceH = pages[i].1 - pages[i].0
    let drawnH = sliceH * scale
    ctx.beginPDFPage(nil)
    ctx.saveGState()
    // Conteudo no topo da coluna, recuado pela margem (coordenadas bottom-up).
    // Reduz a fatia (768px de largura) para a coluna do A4 (~493pt), mantendo as
    // proporcoes do app e levando a fonte para um tamanho de impressao natural.
    ctx.translateBy(x: margin, y: pageH - margin - drawnH)
    ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
    ctx.restoreGState()
    ctx.endPDFPage()
  }
  ctx.closePDF()
  exit(0)
}

let delegate = Delegate()
webView.navigationDelegate = delegate
webView.loadFileURL(inputURL, allowingReadAccessTo: inputURL.deletingLastPathComponent())

DispatchQueue.main.asyncAfter(deadline: .now() + 30) {
  fail("timeout")
}

app.run()
