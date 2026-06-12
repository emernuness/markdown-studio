// Menu bar nativo do macOS, compilado como dylib e chamado uma vez pelo Bun via FFI.
//
// Dois problemas que isso resolve:
//  1. Sem main menu, o macOS engole os atalhos de edição (⌘C/⌘V/⌘X/⌘A): o
//     WKWebView depende da cadeia de respondedores acionada pela barra de menus.
//  2. Sem ativar o app como "regular" e tornar a janela key, NENHUM atalho ⌘
//     chega ao conteúdo web (por isso ⌘B/⌘S no editor também falhavam).
//
// Atalhos que o app trata na própria página (⌘S, ⌘B, ⌘Z do TipTap, ⌘W de aba,
// ⌘F, etc.) NÃO entram no menu: itens de menu interceptam a tecla antes do
// conteúdo web e quebrariam o comportamento do editor.
#import <Cocoa/Cocoa.h>

static NSMenuItem *itemWith(NSString *title, SEL action, NSString *key) {
  return [[NSMenuItem alloc] initWithTitle:title action:action keyEquivalent:key];
}

void install_markdown_studio_menu(const char *appNameC) {
  @autoreleasepool {
    NSString *appName = [NSString stringWithUTF8String:appNameC];
    NSApplication *app = [NSApplication sharedApplication];

    // App regular + ativo: garante janela key recebendo os eventos de teclado.
    [app setActivationPolicy:NSApplicationActivationPolicyRegular];

    NSMenu *menubar = [[NSMenu alloc] init];

    // Menu do aplicativo
    NSMenuItem *appItem = [[NSMenuItem alloc] init];
    [menubar addItem:appItem];
    NSMenu *appMenu = [[NSMenu alloc] initWithTitle:appName];
    [appMenu addItem:itemWith([@"Ocultar " stringByAppendingString:appName],
                              @selector(hide:), @"h")];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItem:itemWith([@"Encerrar " stringByAppendingString:appName],
                              @selector(terminate:), @"q")];
    [appItem setSubmenu:appMenu];

    // Menu Edição: APENAS os seletores de clipboard/seleção que estavam quebrados.
    // (sem Desfazer/Refazer: o editor trata ⌘Z internamente via keydown)
    NSMenuItem *editItem = [[NSMenuItem alloc] init];
    [menubar addItem:editItem];
    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"Edição"];
    [editMenu addItem:itemWith(@"Cortar", @selector(cut:), @"x")];
    [editMenu addItem:itemWith(@"Copiar", @selector(copy:), @"c")];
    [editMenu addItem:itemWith(@"Colar", @selector(paste:), @"v")];
    [editMenu addItem:itemWith(@"Selecionar Tudo", @selector(selectAll:), @"a")];
    [editItem setSubmenu:editMenu];

    // Menu Janela: minimizar (⌘M). Fechar janela fica com o botão vermelho;
    // ⌘W é do app (fecha aba), então não entra aqui.
    NSMenuItem *windowItem = [[NSMenuItem alloc] init];
    [menubar addItem:windowItem];
    NSMenu *windowMenu = [[NSMenu alloc] initWithTitle:@"Janela"];
    [windowMenu addItem:itemWith(@"Minimizar", @selector(performMiniaturize:), @"m")];
    [windowItem setSubmenu:windowMenu];
    [app setWindowsMenu:windowMenu];

    [app setMainMenu:menubar];
    [app activateIgnoringOtherApps:YES];
  }
}
