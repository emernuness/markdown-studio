# Relatório de Débitos Técnicos

**Projeto:** Markdown Studio
**Stack identificada:** Bun 1.3, TypeScript (strict), React 19, Vite 8, Tailwind CSS 4, TipTap 2, CodeMirror 6, webview-bun (desktop macOS), Vitest 4, Biome 2.5
**Data da análise:** 2026-06-12
**Total de arquivos analisados:** 57 (excluídos gerados: desktop/embedded.ts, src/shared/embeddedFonts.ts, dist/, build/)
**Baseline fallow:** health score 89 (A), manutenibilidade 90.3, duplicação 2.2%, ciclomática média 2.2
**Varredura de segredos:** 0 achados em 57 arquivos

## Resumo

- 🔴 Críticos: 0
- 🟠 Altos: 1
- 🟡 Médios: 6
- 🟢 Baixos: 5
- **Total:** 12

> Nota de status: os débitos TD-003, TD-004, TD-005, TD-007, TD-008, TD-009, TD-010 e TD-012 foram corrigidos na mesma sessão desta análise (verificado: fallow 0 issues, 17/17 testes, typecheck e lint limpos). TD-001, TD-002, TD-006 e TD-011 permanecem abertos e possuem issues no GitHub.

---

## [TD-001] 🟠 Alto

**Dimensão:** Princípios SOLID / Clean Code
**Localização:** `src/App.tsx` — arquivo inteiro (~800 linhas; componente `App` concentra ~30 callbacks)
**Problema:** O componente `App` acumula responsabilidades de: gerenciamento de abas e documento ativo, persistência de sessão (bootstrap e autosave), conciliação com o disco e resolução de conflitos, atalhos globais de teclado, zoom, busca, drag and drop, exportação e impressão, e renderização do shell inteiro. Viola o SRP. O fallow estima CRAP 3192 para a unidade (maior do projeto) e aplica dedução de unit size de 10 pontos no health score.
**Impacto:** Qualquer alteração em um fluxo (por exemplo, sessão) exige navegar um arquivo de 800 linhas com estado compartilhado por refs; o raio de regressão de qualquer mudança é o app inteiro. Os 3 bugs de timing encontrados nas sessões de hoje (gate de autosave, docsRef stale) nasceram exatamente desse acoplamento de fases dentro de um único componente.

---

## [TD-002] 🟡 Médio

**Dimensão:** Estrutura e Organização / SOLID
**Localização:** `desktop/server.ts` — função `handleApi`, linhas ~225 até o fim (switch com 16 cases)
**Problema:** Um único switch roteia todas as ações da API (arquivos, diálogos, sessão, recentes, exportações, impressão). A função mistura roteamento, validação e lógica de cada ação; novos endpoints crescem o mesmo bloco.
**Impacto:** Os handlers não são testáveis isoladamente (ver TD-011) e mudanças em uma ação exigem recompilar mentalmente o switch inteiro; a coesão por área (fs, sessão, export) está implícita em vez de explícita.

---

## [TD-003] 🟡 Médio — CORRIGIDO

**Dimensão:** Duplicação de Código (DRY)
**Localização:**
- `src/components/Popover.tsx` — linhas 39-48 (versão original)
- `src/components/ShortcutsPanel.tsx` — linhas 58-67 (versão original)

**Problema:** A lógica de trap de foco (Tab cicla dentro do container) estava implementada duas vezes com seletores de focáveis ligeiramente diferentes entre si.
**Impacto:** Correções de acessibilidade no trap precisavam ser replicadas manualmente; os seletores já haviam divergido (um incluía `input`, o outro não).
**Correção aplicada:** extraída para `src/lib/focusTrap.ts` (`cycleFocusWithin`, `focusFirstWithin`); ambos os componentes consomem o utilitário.

---

## [TD-004] 🟡 Médio — CORRIGIDO

**Dimensão:** Duplicação de Código (DRY)
**Localização:** `src/components/Toolbar.tsx` — linhas 110-120 e 152-162 (versão original; `LinkForm` e `ImageForm`)
**Problema:** O input estilizado dos formulários de link e imagem era idêntico (mesmas classes, mesmos handlers de Enter), detectado pelo fallow como clone de 11 linhas.
**Impacto:** Ajustes de estilo ou acessibilidade no campo precisavam ser feitos em dois lugares.
**Correção aplicada:** extraído o componente `PopoverInput` reutilizado pelos dois formulários, com `aria-label` adicionado.

---

## [TD-005] 🟡 Médio — CORRIGIDO

**Dimensão:** Dependências e Configuração
**Localização:** `package.json` — linha 42 (versão original)
**Problema:** O metapacote `codemirror` estava declarado mas nunca importado (os imports usam os pacotes com escopo `@codemirror/*`). Em sentido inverso, `@tiptap/core` era importado em `tests/markdownRoundtrip.test.ts` sem estar declarado.
**Impacto:** Dependência fantasma infla a instalação e mascara o grafo real; import não declarado funciona por hoisting e pode quebrar sem aviso em atualização de transitivas.
**Correção aplicada:** `codemirror` removido; `@tiptap/core` declarado em devDependencies.

---

## [TD-006] 🟡 Médio

**Dimensão:** Escalabilidade e Performance
**Localização:** `src/lib/useMarkdownEditor.ts` — callback `onUpdate` (serialização completa a cada tecla); `src/components/SearchBar.tsx` — `collectMatches` (TreeWalker completo a cada digitação, debounce de 90 ms)
**Problema:** No modo visual, cada keystroke serializa o documento inteiro para markdown (`getMarkdown`) para alimentar o estado; a busca varre todos os text nodes do documento a cada alteração de termo. Custo O(n) por interação, com n proporcional ao tamanho do documento.
**Impacto:** Imperceptível em documentos típicos; em arquivos na casa de 1 MB ou termos de 1 letra com centenas de ocorrências, a latência de digitação e de busca cresce linearmente e pode degradar a experiência no caso de uso central (ler arquivos grandes).

---

## [TD-007] 🟡 Médio — CORRIGIDO

**Dimensão:** Clean Code
**Localização:** `src/App.tsx` — 15 ocorrências do padrão `docsRef.current.find((d) => d.id === activeIdRef.current)`
**Problema:** A expressão para obter o documento ativo fora do ciclo de render estava repetida em 15 callbacks, sem nome que comunicasse a intenção.
**Impacto:** Ruído de leitura e risco de variação sutil (uma das cópias poderia consultar outra ref).
**Correção aplicada:** helper `getActive()` (useCallback estável) substituiu todas as ocorrências.

---

## [TD-008] 🟢 Baixo — CORRIGIDO

**Dimensão:** Clean Code
**Localização:** `src/App.tsx` — literais 4000, 6000, 1200 e 4000 espalhados (flash, confirmação de fechar, autosave, poll de disco)
**Problema:** Números mágicos de temporização sem nome, repetidos em pontos distantes do arquivo.
**Impacto:** Relação entre os tempos (por exemplo, flash menor que a janela de confirmação) ficava implícita; ajuste exigia caça aos literais.
**Correção aplicada:** objeto `TIMING` nomeado no topo do arquivo, consumido em todos os pontos.

---

## [TD-009] 🟢 Baixo — CORRIGIDO

**Dimensão:** Clean Code / Tipagem
**Localização:**
- `src/lib/types.ts` — interface `DocState` (morta; o App usa `TabDoc` local)
- `src/components/TabBar.tsx` — export desnecessário de `TabInfo`
- `src/components/Outline.tsx` — exports desnecessários de `OutlineItem` e `extractOutline`
- `src/lib/api.ts` — exports desnecessários de `DialogResult` e `FileContent`
- `tests/markdownRoundtrip.test.ts` — cast `as never` para contornar a assinatura de `getMarkdown`

**Problema:** Tipos mortos e exports sem consumidor externo (confirmados pelo fallow: 2 unused exports, 4 unused types); cast inseguro em teste.
**Impacto:** Superfície pública maior do que a real engana leitores e ferramentas; `as never` desliga o compilador exatamente onde o teste valida contrato.
**Correção aplicada:** tipo morto removido, exports internalizados, e `getMarkdown` passou a aceitar o editor por tipagem estrutural (cast eliminado).

---

## [TD-010] 🟢 Baixo — CORRIGIDO

**Dimensão:** Documentação
**Localização:** raiz do projeto (ausência de `LICENSE`)
**Problema:** Projeto destinado a publicação pública sem licença declarada.
**Impacto:** Sem licença, o código publicado é "todos os direitos reservados": terceiros não podem legalmente usar, modificar ou redistribuir.
**Correção aplicada:** `LICENSE` MIT adicionada.

---

## [TD-011] 🟢 Baixo

**Dimensão:** Testabilidade
**Localização:** `desktop/server.ts` — 0 testes diretos (os 17 testes existentes cobrem frontend e fluxos integrados via mock de fetch)
**Problema:** Os handlers do backend (leitura/escrita/stat de arquivos, sessão, rename com validações, pipeline de export) não têm testes unitários. Parte depende de binários do macOS (osascript, textutil), mas os handlers de fs e sessão são testáveis com arquivos temporários.
**Impacto:** Regressões em validação de caminho, rename (colisão, extensão) ou formato da sessão só seriam pegas manualmente; o contrato da API entre front e back não tem verificação automática do lado servidor.

---

## [TD-012] 🟢 Baixo — CORRIGIDO

**Dimensão:** Dependências e Configuração
**Localização:** raiz do projeto (ausência de configuração do analisador estático)
**Problema:** Sem configuração de entry points, o fallow reportava 4 falsos positivos de arquivos mortos (`desktop/main.ts`, `desktop/worker.ts`, `scripts/gen-*.ts` são entry points de build/runtime fora do grafo do Vite), poluindo qualquer análise futura.
**Impacto:** Falso positivo recorrente treina o time a ignorar o relatório da ferramenta.
**Correção aplicada:** `.fallowrc.json` com entry points e ignorePatterns dos gerados; análise reexecutada fecha em 0 issues.

---
