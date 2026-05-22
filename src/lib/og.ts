import satori from 'satori';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const fontSans400 = readFileSync(join(root, 'node_modules/geist/dist/fonts/geist-sans/Geist-Regular.ttf'));
const fontSans500 = readFileSync(join(root, 'node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf'));
const fontMono400 = readFileSync(join(root, 'node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.ttf'));

// accent is the hex equivalent of --color-accent: oklch(74% 0.07 240) in global.css
export const ACCENT_HEX = '#8fabc8';

const C = {
  bg:     '#0e1116',
  ink:    '#dde0e6',
  ink2:   '#a0a6ae',
  mute:   '#5e6670',
  rule:   'rgba(255,255,255,0.06)',
  accent: ACCENT_HEX,
} as const;

type Node = { type: string; props: Record<string, any> };

function h(type: string, style: Record<string, any>, children?: any): Node {
  const kids = Array.isArray(children) ? children.filter(c => c != null) : children;
  const props: Record<string, any> = { style };
  if (kids != null) props.children = kids;
  return { type, props };
}

export interface OGOptions {
  title: string;
  label?: string;
  subtitle?: string;
  meta?: string;
}

export async function generateOG(opts: OGOptions): Promise<Buffer> {
  const { title, label, subtitle, meta } = opts;
  const fontSize = title.length > 70 ? 36 : title.length > 50 ? 42 : title.length > 35 ? 48 : 54;

  const node = h('div', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: C.bg,
  }, [
    // Header strip
    h('div', {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '32px 60px 28px',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: C.rule,
      flexShrink: 0,
    }, [
      h('div', { display: 'flex', alignItems: 'center', gap: '14px' }, [
        h('div', {
          display: 'flex',
          width: '20px',
          height: '20px',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'rgba(255,255,255,0.2)',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }, [
          h('div', { width: '8px', height: '8px', backgroundColor: C.accent }),
        ]),
        h('span', {
          fontFamily: 'Geist Mono',
          fontSize: '17px',
          fontWeight: 400,
          letterSpacing: '2px',
          color: C.ink,
        }, 'OCTA'),
        h('span', {
          fontFamily: 'Geist Mono',
          fontSize: '13px',
          color: C.mute,
          letterSpacing: '1px',
        }, '/v0.1'),
      ]),
      h('span', {
        fontFamily: 'Geist Mono',
        fontSize: '13px',
        color: C.mute,
        letterSpacing: '1px',
      }, 'octa.page'),
    ]),

    // Content area
    h('div', {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      padding: '56px 60px 44px',
      justifyContent: 'space-between',
    }, [
      h('div', { display: 'flex', flexDirection: 'column', gap: '20px' }, [
        label ? h('span', {
          fontFamily: 'Geist Mono',
          fontSize: '14px',
          color: C.accent,
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }, label) : null,
        h('div', {
          fontFamily: 'Geist',
          fontSize: `${fontSize}px`,
          fontWeight: 500,
          color: C.ink,
          letterSpacing: '-1px',
          lineHeight: 1.15,
          maxWidth: '980px',
        }, title),
        subtitle ? h('div', {
          fontFamily: 'Geist',
          fontSize: '18px',
          color: C.ink2,
          lineHeight: 1.5,
          maxWidth: '780px',
          marginTop: '4px',
        }, subtitle) : null,
      ]),

      meta ? h('div', {
        display: 'flex',
        alignItems: 'center',
        gap: '28px',
        paddingTop: '24px',
        borderTopWidth: '1px',
        borderTopStyle: 'solid',
        borderTopColor: C.rule,
      }, [
        h('span', {
          fontFamily: 'Geist Mono',
          fontSize: '14px',
          color: C.mute,
        }, meta),
      ]) : null,
    ]),
  ]);

  const svg = await satori(node as any, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Geist',      data: fontSans400, weight: 400, style: 'normal' },
      { name: 'Geist',      data: fontSans500, weight: 500, style: 'normal' },
      { name: 'Geist Mono', data: fontMono400, weight: 400, style: 'normal' },
    ],
  });

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
