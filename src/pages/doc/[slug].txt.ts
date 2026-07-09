import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { marked } from 'marked';
import { ALL_TYPES } from '../../lib/types';

export async function getStaticPaths() {
  const types = ALL_TYPES;
  const all = (
    await Promise.all(
      types.map(async type => {
        const entries = await getCollection(type, ({ data }) => data.status === 'published');
        return entries.map(entry => ({ entry, type }));
      })
    )
  ).flat();

  // RFC number = chronological position across the whole notebook
  all.sort((a, b) => a.entry.data.date.getTime() - b.entry.data.date.getTime());

  return all.map(({ entry, type }, i) => ({
    params: { slug: entry.id },
    props: { entry, type, num: i + 1 },
  }));
}

const WIDTH = 72;
const AUTHOR = 'Christian Elías';

function wrap(text: string, indent: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = indent;
  for (const w of words) {
    if (line.length > indent.length && line.length + 1 + w.length > WIDTH) {
      lines.push(line);
      line = indent;
    }
    line += (line.length > indent.length ? ' ' : '') + w;
  }
  if (line.length > indent.length) lines.push(line);
  return lines;
}

function center(text: string): string[] {
  return wrap(text, '').map(l => ' '.repeat(Math.max(0, Math.floor((WIDTH - l.length) / 2))) + l);
}

function lr(left: string, right: string): string {
  return left + ' '.repeat(Math.max(1, WIDTH - left.length - right.length)) + right;
}

/** Flatten inline tokens to plain text; external links become "[n]" refs. */
function inline(tokens: any[] | undefined, refs: string[]): string {
  let out = '';
  for (const t of tokens ?? []) {
    switch (t.type) {
      case 'link': {
        const label = t.tokens ? inline(t.tokens, refs) : t.text;
        if (t.href && /^https?:/.test(t.href)) {
          let i = refs.indexOf(t.href);
          if (i === -1) i = refs.push(t.href) - 1;
          out += `${label} [${i + 1}]`;
        } else {
          out += label;
        }
        break;
      }
      case 'image':
        out += t.text || t.href || '';
        break;
      case 'codespan':
        out += `"${t.text}"`;
        break;
      case 'strong':
      case 'em':
      case 'del':
        out += inline(t.tokens, refs);
        break;
      case 'br':
        out += ' ';
        break;
      default:
        out += t.text ?? '';
    }
  }
  return out;
}

function renderBlocks(tokens: any[], refs: string[], sec: { n: number; sub: number }, indent: string): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'heading': {
        let num: string;
        if (t.depth <= 2) {
          sec.n += 1;
          sec.sub = 0;
          num = `${sec.n}.`;
        } else {
          sec.sub += 1;
          num = `${sec.n}.${sec.sub}.`;
        }
        out.push(`${num}  ${inline(t.tokens, refs)}`, '');
        break;
      }
      case 'paragraph':
        out.push(...wrap(inline(t.tokens, refs), indent), '');
        break;
      case 'code':
        out.push(...t.text.split('\n').map((l: string) => (indent + l).trimEnd()), '');
        break;
      case 'blockquote':
        out.push(...renderBlocks(t.tokens ?? [], refs, sec, indent + '   '));
        break;
      case 'list': {
        let n = t.start || 1;
        for (const item of t.items) {
          const marker = t.ordered ? `${indent}${n}. `.padEnd(indent.length + 3) : `${indent}o  `;
          const hang = ' '.repeat(marker.length);
          let first = true;
          for (const bt of item.tokens ?? []) {
            if (bt.type === 'text' || bt.type === 'paragraph') {
              const lines = wrap(inline(bt.tokens ?? [bt], refs), hang);
              if (first && lines.length) {
                lines[0] = marker + lines[0].slice(hang.length);
                first = false;
              }
              out.push(...lines);
            } else {
              out.push(...renderBlocks([bt], refs, sec, hang));
            }
          }
          n += 1;
        }
        out.push('');
        break;
      }
      // ponytail: tables, raw HTML, and anything exotic pass through verbatim
      case 'table':
      case 'html':
        out.push(...t.raw.trimEnd().split('\n').map((l: string) => (indent + l).trimEnd()), '');
        break;
      case 'hr':
        out.push(indent + '* * *', '');
        break;
    }
  }
  return out;
}

export const GET: APIRoute = ({ props }) => {
  const { entry, type, num } = props as { entry: any; type: string; num: number };
  const d = entry.data;

  const rfcDate = d.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const refs: string[] = [];
  const sec = { n: 0, sub: 0 };
  const body = renderBlocks(marked.lexer(entry.body ?? ''), refs, sec, '   ');

  const lines: string[] = [
    lr('Octa Engineering Notes', AUTHOR),
    lr(`Request for Comments: OCTA-${num}`, 'octa.page'),
    lr('Category: Informational', rfcDate),
    '',
    '',
    ...center(d.title),
    '',
    ...(d.description ? ['Abstract', '', ...wrap(d.description, '   '), ''] : []),
    'Status of This Memo',
    '',
    ...wrap(
      `This memo documents ${type} notes for the Internet community. It does not specify an Internet standard of any kind. Distribution of this memo is unlimited. The canonical version lives at https://octa.page/doc/${entry.id}/ and the machine-readable source at https://octa.page/doc/${entry.id}.md`,
      '   '
    ),
    '',
    ...body,
  ];

  if (refs.length) {
    lines.push(`${sec.n + 1}.  References`, '');
    refs.forEach((url, i) => lines.push(...wrap(`[${i + 1}] ${url}`, '   ')));
    lines.push('');
  }

  // ponytail: single trailing footer; real 58-line pagination with form feeds if the joke lands
  const foot = AUTHOR.padEnd(WIDTH - 8);
  const mid = Math.floor((WIDTH - 'Informational'.length) / 2);
  lines.push('', foot.slice(0, mid) + 'Informational' + foot.slice(mid + 'Informational'.length) + '[Page 1]');

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
