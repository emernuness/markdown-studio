# Issues de Débito Técnico — Markdown Studio

Análise de 2026-06-12. Dos 12 débitos identificados, 8 foram corrigidos na própria sessão de análise (ver `RELATORIO-DEBITOS-TECNICOS.md`). As 4 issues abaixo cobrem os débitos remanescentes.

---

## Issue 1

**Título:** [TD-001] 🟠 Componente App concentra todas as responsabilidades do shell (~800 linhas)
**Labels:** `high`, `solid`, `clean-code`, `tech-debt`

## Resumo
O componente `App` é o único dono de todo o estado e de todos os fluxos do aplicativo: abas, sessão, conciliação com disco, atalhos, zoom, busca, drag and drop e exportação.

## Dimensão
Princípios SOLID / Clean Code

## Severidade
🟠 Alto. Maior unidade do projeto (CRAP estimado 3192 pelo fallow), com histórico real de bugs de timing nascidos do acoplamento entre fases dentro do mesmo componente.

## Localização
- `src/App.tsx` (arquivo inteiro, ~800 linhas, ~30 callbacks no componente `App`)

## Trecho de código
```tsx
// src/App.tsx (estrutura, resumida)
export default function App() {
  // 12 useState + 8 useRef
  // gerenciamento de abas: addDocument, switchTo, closeTab, reopenClosed, cycleTab
  // sessão: bootstrap (restore + arquivo inicial), autosave com debounce
  // disco: reconcileWithDisk, resolveConflict, poll de mtime, focus listener
  // atalhos globais: ~15 combinações num único onKey
  // zoom, busca, shortcuts panel, drag and drop, export, print, rename
  // + renderização de TabBar, header, Outline, editor, banner, StatusBar
}
```

## Problema
Viola o Single Responsibility Principle: o componente tem ao menos sete eixos de mudança independentes (abas, sessão, disco, atalhos, visual, export, busca). O estado é compartilhado por refs (`docsRef`, `activeIdRef`, `bootstrappedRef`) cuja ordem de atualização em relação ao ciclo do React é sutil.

## Impacto
O raio de regressão de qualquer mudança é o app inteiro. Dois bugs reais desta categoria já ocorreram durante o desenvolvimento: o gate de autosave que nunca abria (efeitos do React 19 em microtask) e a reconciliação lendo `docsRef` desatualizado logo após `setDocs`. Ambos exigiram testes de integração dedicados para serem detectados.

## Evidências adicionais
- fallow health: dedução de unit size de 10 pontos atribuída a esta unidade.
- Os testes do projeto precisam montar o `App` completo para validar qualquer fluxo isolado.

---

## Issue 2

**Título:** [TD-002] 🟡 handleApi roteia 16 ações num único switch
**Labels:** `medium`, `architecture`, `tech-debt`

## Resumo
Toda a API do backend desktop vive num único switch dentro de `handleApi`, misturando roteamento, validação e lógica de cada ação.

## Dimensão
Estrutura e Organização / SOLID

## Severidade
🟡 Médio. Não causa defeito hoje, mas concentra crescimento e impede teste unitário por handler.

## Localização
- `desktop/server.ts`, função `handleApi` (linhas ~225 até o fim do arquivo)

## Trecho de código
```ts
// desktop/server.ts
async function handleApi(action: string, req: Request, options: ServerOptions): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as JsonBody;
  switch (action) {
    case "health": ...
    case "initial": ...
    case "dialog/open": ...
    case "dialog/save": ...
    case "file/read": ...
    case "file/stat": ...
    case "file/write": ...
    case "file/rename": ...
    case "session/save": ...
    case "session/load": ...
    case "recent": ...
    case "recent/add": ...
    case "export": ...
    case "print": ...
    case "reveal": ...
  }
}
```

## Problema
Função única com 16 responsabilidades de negócio distintas (fs, diálogos nativos, sessão, recentes, exportação). A coesão por área existe apenas implicitamente na ordem dos cases.

## Impacto
Handlers não podem ser importados nem testados isoladamente (relacionado ao TD-011); cada novo endpoint aumenta a mesma função; revisões de mudanças pequenas carregam o diff de contexto do switch inteiro.

---

## Issue 3

**Título:** [TD-006] 🟡 Serialização e busca percorrem o documento inteiro a cada interação
**Labels:** `medium`, `performance`, `tech-debt`

## Resumo
No modo visual, cada tecla serializa o documento completo para markdown; na busca, cada alteração de termo varre todos os text nodes do documento.

## Dimensão
Escalabilidade e Performance

## Severidade
🟡 Médio. Sem impacto em documentos típicos; degradação linear no caso de uso central do produto (ler arquivos grandes).

## Localização
- `src/lib/useMarkdownEditor.ts`, callback `onUpdate` (serialização por keystroke)
- `src/components/SearchBar.tsx`, função `collectMatches` (TreeWalker completo, debounce de 90 ms)

## Trecho de código
```ts
// src/lib/useMarkdownEditor.ts
onUpdate: ({ editor }) => {
  onMarkdownChange(getMarkdown(editor)); // serializa o doc inteiro a cada tecla
},
```
```ts
// src/components/SearchBar.tsx
const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
for (let node = walker.nextNode(); node; node = walker.nextNode()) {
  // varre todos os text nodes a cada termo digitado
}
```

## Problema
Custo O(tamanho do documento) por interação de digitação e por tecla digitada na busca. Termos de 1 caractere geram centenas de Ranges de highlight.

## Impacto
Em documentos na casa de 1 MB, a latência de digitação e de busca cresce de forma perceptível, contrariando o objetivo declarado do produto de ser o leitor padrão de arquivos markdown grandes (READMEs e documentação de projeto).

---

## Issue 4

**Título:** [TD-011] 🟢 Backend desktop sem testes unitários
**Labels:** `low`, `testing`, `tech-debt`

## Resumo
Os handlers do servidor desktop (arquivos, sessão, rename, export) não possuem testes diretos; a suíte atual cobre o frontend e os fluxos integrados com fetch mockado.

## Dimensão
Testabilidade

## Severidade
🟢 Baixo. O risco é mitigado pelos 17 testes de integração do frontend, mas o contrato do lado servidor não tem verificação automática.

## Localização
- `desktop/server.ts` (0 testes diretos; a pasta `tests/` cobre apenas `src/`)

## Trecho de código
```ts
// desktop/server.ts — exemplo de lógica com validações não testadas
case "file/rename": {
  const finalName = /\.(md|markdown|mdown|txt)$/i.test(newName) ? newName : `${newName}.md`;
  const newPath = join(dirname(path), finalName);
  if (await Bun.file(newPath).exists())
    return json({ error: "Já existe um arquivo com esse nome." }, 409);
  ...
}
```

## Problema
Validações de caminho, regras de rename (extensão, colisão), formato do arquivo de sessão e seleção de browser para export PDF são lógica pura ou facilmente isolável com arquivos temporários, e nada disso roda em CI. Parte do arquivo depende de binários do macOS (osascript, textutil), o que explica, mas não cobre, a ausência dos testes possíveis.

## Impacto
Regressões nessas validações só seriam percebidas manualmente; mudanças no formato da sessão podem quebrar a restauração de rascunhos sem nenhum teste falhar. Relacionado ao TD-002: o switch monolítico é o que impede importar handlers isoladamente.

---
