# Product

## Register

product

## Users
Emerson (e usuários mac-first como ele): pessoas que vivem cercadas de arquivos `.md` — notas, docs de projeto, READMEs — e querem abri-los no macOS como documentos de verdade, não como código. Contexto: trabalho diário no MacBook, multitarefa, alterna entre ler (maioria do tempo) e editar (rajadas curtas). Job to be done: "abrir um markdown, vê-lo bonito e legível na hora, editar com conforto de Word e salvar markdown limpo de volta".

## Product Purpose
Markdown Studio é um visualizador + editor desktop de Markdown para macOS: janela nativa, binário único (Bun), abre `.md` já renderizado e editável (WYSIWYG TipTap), com modo código (CodeMirror) sincronizado. Sucesso = o usuário para de abrir `.md` no VS Code/preview e passa a viver aqui: abre rápido, lê confortável, edita sem pensar em sintaxe, exporta (PDF/HTML/DOCX/RTF) com fidelidade total ao que vê.

## Brand Personality
Editorial, calmo, preciso. Voz de instrumento de escrita, não de IDE: o documento é o protagonista, o chrome desaparece. Emoções-alvo: foco, conforto de leitura, confiança de que nada do arquivo se perde.

## Anti-references
- IDE escura genérica (VS Code clone): este app não é para programar.
- SaaS-cream genérico com gradientes roxos e glassmorphism.
- Word/Office real: toolbar de 3 fileiras, ribbon, poluição de chrome.
- Scroll lateral em toolbars (rejeitado explicitamente pelo usuário; overflow vai para menu "⋯").
- Editores web que reescrevem/perdem markdown no roundtrip (cores, checkboxes e tabelas devem sobreviver intactos).

## Design Principles
1. **Documento primeiro**: cada pixel de chrome compete com o texto; toolbar de 1 linha, painéis somem quando não usados (abas só com 2+ docs).
2. **Fidelidade de ida e volta**: o que se vê é o que se salva e o que se exporta — markdown limpo, exports com a mesma tipografia do app.
3. **Tudo ao alcance do teclado**: cada ação primária tem atalho (⌘O ⌘S ⇧⌘E…); mouse é opção, não requisito.
4. **Degradar com elegância**: janela estreita colapsa grupos em "⋯"; sem Chromium headless, PDF cai no diálogo nativo de impressão; sem path no drop, ⌘S resolve.
5. **Feedback imediato e discreto**: salvo/não salvo sempre visível, ações confirmam em palavras curtas ("Salvo.", "Copiado!"), nunca modais bloqueantes.

## Accessibility & Inclusion
WCAG AA: contraste ≥4.5:1 no texto do documento e da UI; alvos de clique ≥28px na toolbar; toda animação com alternativa em `prefers-reduced-motion`; foco visível; atalhos documentados em tooltips. Idioma da UI: pt-BR.
