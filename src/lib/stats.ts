export interface DocStats {
  words: number;
  chars: number;
  readingMinutes: number;
}

/** Estatísticas a partir do markdown bruto (ignora sintaxe de marcação comum). */
export function computeStats(markdown: string): DocStats {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~|\-=]+/g, " ");
  const words = plain.split(/\s+/).filter((w) => /\p{L}|\p{N}/u.test(w)).length;
  const chars = markdown.length;
  const readingMinutes = words === 0 ? 0 : Math.max(1, Math.round(words / 200));
  return { words, chars, readingMinutes };
}
