import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { config, LANGUAGES } from './config.ts';
import type { Language, VideoMeta } from './types.ts';

const asset = (name: string) => readFileSync(join(config.dirs.templates, name), 'utf8');

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** A self-contained notebook page: styles and layout script are inlined, fonts and Mermaid come from CDNs. */
export function buildPage(language: Language, meta: VideoMeta, fragment: string): string {
  const L = LANGUAGES[language];
  const [y, m, d] = meta.date.split('-');
  const metaLine = [meta.episode ? `${L.meta} ${meta.episode}` : null, meta.teacher].filter(Boolean).join(' · ');
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(meta.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap" rel="stylesheet">
<style>${asset('notes.css')}</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
</head>
<body data-date="${d}/${m}/${y}" data-date-label="${L.dateLabel}" data-page-label="${L.pageLabel}">
<div id="content">
<p class="meta">${escapeHtml(metaLine)}</p>
${fragment}
</div>
<script>${asset('notes.js')}</script>
</body>
</html>`;
}

/** Renders one PDF per language into outDir; also keeps the HTML next to it for the future website. */
export async function renderPdfs(meta: VideoMeta, fragments: Partial<Record<Language, string>>, outDir: string): Promise<string[]> {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const files: string[] = [];
    for (const [language, fragment] of Object.entries(fragments) as [Language, string][]) {
      const html = buildPage(language, meta, fragment);
      const base = join(outDir, `notes-${language}`);
      writeFileSync(`${base}.html`, html);
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => (window as Window & { __ready?: boolean }).__ready === true, null, { timeout: 60_000 });
      await page.pdf({ path: `${base}.pdf`, preferCSSPageSize: true, printBackground: true });
      files.push(`${base}.pdf`);
    }
    return files;
  } finally {
    await browser.close();
  }
}
