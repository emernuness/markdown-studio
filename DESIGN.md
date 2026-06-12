---
name: Markdown Studio
description: Editor desktop de Markdown para macOS com alma editorial — papel quente, serifa e um único acento terracota.
colors:
  paper: "#f6f4ee"
  paper-deep: "#efece3"
  card: "#fdfcfa"
  ink: "#211d19"
  ink-soft: "#5c554d"
  ink-faint: "#6e675e"
  line: "#e4dfd4"
  line-strong: "#d3ccbe"
  accent: "#bc4b27"
  accent-deep: "#9c3a1b"
  accent-wash: "#f5e3db"
  ok: "#3f6f4f"
typography:
  display:
    fontFamily: "Newsreader Variable, Iowan Old Style, Georgia, serif"
    fontSize: "2.3em"
    fontWeight: 600
    lineHeight: 1.22
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Newsreader Variable, Iowan Old Style, Georgia, serif"
    fontSize: "17.5px"
    fontWeight: 400
    lineHeight: 1.72
  label:
    fontFamily: "Schibsted Grotesk Variable, Avenir Next, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
  mono:
    fontFamily: "JetBrains Mono, SF Mono, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  sm: "7px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "48px"
components:
  button-toolbar:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    height: "30px"
    padding: "0 7px"
  button-toolbar-active:
    backgroundColor: "{colors.accent-wash}"
    textColor: "{colors.accent-deep}"
    rounded: "{rounded.sm}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
  menu-panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "6px"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "8px"
    height: "32px"
    padding: "0 10px"
---

# Design System: Markdown Studio

## 1. Overview

**Creative North Star: "A Escrivaninha"**

Uma mesa de escrita bem arrumada: o papel está à frente, as ferramentas estão à mão, mas em silêncio. Toda a interface se organiza em torno desse contrato. O documento ocupa o centro em serifa generosa sobre papel quente; o chrome (toolbar de uma linha, status bar de 28px) vive nas bordas em sans discreta e some quando não é necessário (abas só existem com 2+ documentos, menus colapsam num "⋯"). A tinta é quase preta e quente; uma única cor de caneta, a terracota, marca seleção, estado e ação, e por ser rara, fala alto.

O sistema rejeita explicitamente: cara de IDE escura, SaaS-cream com gradientes roxos e glassmorphism, ribbon de Office com três fileiras de botões, e qualquer scroll lateral em toolbar. A densidade é de instrumento de leitura, não de painel de dados: espaço generoso no documento, compacidade honesta no chrome.

**Key Characteristics:**
- Documento em serifa (Newsreader) protagonista; UI em grotesca (Schibsted) coadjuvante
- Um acento só (terracota #bc4b27) para ação, seleção e estado "sujo"
- Plano por padrão; sombra apenas em camadas flutuantes
- Chrome que colapsa: abas condicionais, overflow "⋯", labels que somem em janelas estreitas
- Feedback em palavras curtas ("Salvo.", "Copiado!"), nunca modal

## 2. Colors

Papel quente, tinta quente, uma caneta terracota: paleta contida (Restrained) com acento ≤10% da tela.

### Primary
- **Terracota** (#bc4b27): a caneta da casa. Botão primário, estados ativos da toolbar, cursor do editor, indicador "não salvo", borda de citação. Nunca decorativa: se está terracota, é ação, seleção ou estado.
- **Terracota Profunda** (#9c3a1b): hover/press do primário e links no documento.
- **Banho de Terracota** (#f5e3db): fundo de estado ativo na toolbar e confirmação de fechar aba.

### Neutral
- **Papel** (#f6f4ee): fundo do corpo; a folha sobre a mesa.
- **Papel Fundo** (#efece3): segunda camada neutra — barra de abas, código inline, cabeçalho de painel, trilho do toggle Visual/Código.
- **Cartão** (#fdfcfa): superfícies levantadas (header, menus, painel de código, cards de recentes).
- **Tinta** (#211d19): texto do documento e títulos. Contraste 13.5:1 sobre Papel.
- **Tinta Suave** (#5c554d): texto de UI e ícones da toolbar (6.7:1 sobre Papel).
- **Tinta Esmaecida** (#6e675e): metadados, status bar, abas inativas, numeração de linha (4.6:1 sobre Papel — AA). Para texto corrido use Tinta.
- **Linha** (#e4dfd4) / **Linha Forte** (#d3ccbe): divisores e bordas de 1px; Forte para bordas de painéis e células de tabela.
- **Verde Salvo** (#3f6f4f): exclusivo do estado "Salvo" na status bar e do feedback "Copiado!".

### Named Rules
**The One Pen Rule.** Existe uma caneta sobre esta mesa. Terracota é a única cor de ação; o verde existe apenas para dizer "salvo/copiado". Introduzir um segundo acento é proibido.

**The Warm Ink Rule.** Nenhum cinza frio entra no sistema. Todo neutro carrega o calor do papel (matiz 40-80 em chroma baixo); texto cinza-azulado é corpo estranho.

## 3. Typography

**Display Font:** Newsreader Variable (fallback Iowan Old Style, Georgia)
**Body Font:** Newsreader Variable — o documento inteiro é serifado
**Label/Mono Font:** Schibsted Grotesk Variable (UI) · JetBrains Mono (código)

**Character:** Par em eixo de contraste real: serifa ótica de leitura no conteúdo, grotesca compacta no chrome. A serifa usa `opsz` variável (17 no corpo, 60 nos títulos). O documento parece impresso; a UI parece instrumento.

### Hierarchy
- **Display / H1** (600, 2.3em, 1.22, -0.012em): título do documento. Só dentro do conteúdo renderizado.
- **Headline / H2** (600, 1.65em, 1.22): seções do documento.
- **Title / H3-H4** (600, 1.28em / 1.08em): subdivisões.
- **Body** (400, 17.5px, 1.72): prosa do documento, máx. 780px de coluna (~68ch).
- **Label** (500-600, 12.5-13px, Schibsted): botões, menus, abas, status bar. Caixa normal; uppercase só no rótulo "MARKDOWN" do painel de código (1 lugar, tracking 0.14em).
- **Mono** (400, 13.5px, 1.75): modo código e blocos de código.

### Named Rules
**The Two Worlds Rule.** Serifa jamais em chrome; grotesca jamais no documento. A fronteira entre papel e instrumento é tipográfica antes de ser cromática.

## 4. Elevation

Plano por padrão. Superfícies em repouso se separam por tom (Papel → Papel Fundo → Cartão) e bordas de 1px, nunca por sombra. Sombra existe somente em camadas que flutuam de verdade sobre o papel: menus/popovers (`0 18px 40px -18px rgba(33,29,25,0.35) + 0 4px 12px -6px rgba(33,29,25,0.18)`) e o painel de código (`0 14px 34px -22px rgba(33,29,25,0.45)`). O toggle Visual/Código usa um `shadow-sm` mínimo no segmento ativo.

### Shadow Vocabulary
- **Flutuante** (`0 18px 40px -18px rgba(33,29,25,0.35), 0 4px 12px -6px rgba(33,29,25,0.18)`): menus, popovers, dropdowns — tudo que abre por cima do documento.
- **Painel** (`0 14px 34px -22px rgba(33,29,25,0.45)`): contêineres grandes destacados do papel (painel de código).

### Named Rules
**The Floating-Only Rule.** Se o elemento não abre por cima de outro, ele não tem sombra. Card em repouso com sombra é violação; tom + borda resolvem.

## 5. Components

Refinados e contidos: cantos 7-12px, estados sutis, acento só onde há ação ou seleção.

### Buttons
- **Shape:** cantos suaves (7px toolbar, 12px primário); pill apenas em kbd-chips.
- **Toolbar:** 30px de altura, ícone 16px stroke 1.8, texto Tinta Suave; hover = tinta a 7% de opacidade; ativo = Banho de Terracota + texto Terracota Profunda.
- **Primary:** fundo Terracota, texto branco, 40px, hover Terracota Profunda com leve `active:scale-[0.98]`.
- **Disabled:** opacidade 0.35, sem pointer events.

### Chips
- **kbd:** atalhos em chips discretos (11px, Papel Fundo, texto Tinta Esmaecida) dentro de menus e botões da Welcome.

### Cards / Containers
- **Corner Style:** 12px (menus), 16px (painel de código, lista de recentes), 2xl só no overlay de drop.
- **Background:** Cartão sobre Papel.
- **Shadow Strategy:** ver Elevation — flutuantes apenas.
- **Border:** 1px Linha Forte em painéis; 1px Linha em listas.
- **Internal Padding:** 6px em menus; 16-20px em painéis.

### Inputs / Fields
- **Style:** fundo Papel, borda 1px Linha Forte, 8px de raio, 32px de altura, texto 13px.
- **Focus:** borda muda para Terracota; sem glow, sem ring duplo.

### Navigation
- **Toolbar** (48px): grupos separados por divisores de 1px×18px; colapsa por container queries para o menu "⋯" (1080/920/760/560px); labels somem a 1180px.
- **Abas** (36px): só com 2+ docs; ativa = Cartão com borda, inativa = transparente com texto Esmaecido; ponto terracota = não salva; ✕ em hover, confirmação em 2 cliques.
- **Status bar** (28px): contagens à esquerda, caminho + estado salvo à direita.

### Painel de Código (signature)
Moldura de Cartão com cabeçalho próprio: rótulo "MARKDOWN" em mono uppercase rastreado + botão Copiar com feedback ("✓ Copiado!" em Verde Salvo por 1.8s). CodeMirror dentro com numeração em Tinta Esmaecida, seleção em terracota a 18%.

## 6. Do's and Don'ts

### Do:
- **Do** manter o acento terracota em ≤10% de qualquer tela; raridade é o que dá autoridade à cor (The One Pen Rule).
- **Do** separar superfícies por tom e borda de 1px; sombra somente em camadas flutuantes (The Floating-Only Rule).
- **Do** usar serifa Newsreader exclusivamente no documento e grotesca Schibsted exclusivamente no chrome (The Two Worlds Rule).
- **Do** confirmar ações com palavras curtas inline ("Salvo.", "Copiado!"); estado de arquivo sempre visível na status bar.
- **Do** colapsar toolbar via container queries para o menu "⋯" — todos os itens permanecem alcançáveis em qualquer largura.
- **Do** garantir AA: corpo ≥4.5:1, alvos ≥28px, `prefers-reduced-motion` em toda animação.

### Don't:
- **Don't** usar "IDE escura genérica" como direção: este app não é VS Code (anti-referência do PRODUCT.md).
- **Don't** introduzir "SaaS-cream com gradientes roxos e glassmorphism" — banido por nome no PRODUCT.md.
- **Don't** recriar "ribbon de Office com três fileiras": a toolbar tem uma linha, para sempre.
- **Don't** usar "scroll lateral em toolbars" — rejeitado explicitamente pelo usuário; overflow vai para o "⋯".
- **Don't** usar Tinta Esmaecida em texto corrido do documento; é cor de chrome/metadado (AA garantido apenas em tamanhos de UI).
- **Don't** aplicar sombra em elementos em repouso, border-left colorida >1px, gradient text ou modais de confirmação — confirmação é inline (2 cliques no ✕).
- **Don't** deixar markdown sofrer no roundtrip: cores, checkboxes e tabelas sobrevivem intactos ou a feature não entra.
