/**
 * Minimal XML → JS parser for Fedena API responses (elements + text; attributes are ignored).
 *  - an element with no children becomes its trimmed text ('' when empty)
 *  - an element with children becomes an object; repeated child names become arrays
 * Use arr() to read "zero, one or many" children uniformly.
 */
const TOKEN = /<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<\?[\s\S]*?\?>|<(\/?)([A-Za-z_][\w.:-]*)([^>]*?)(\/?)>|([^<]+)/g;

export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function toValue(node) {
  if (!node.kids.length) return node.text.trim();
  const obj = {};
  for (const kid of node.kids) {
    const v = toValue(kid);
    if (kid.name in obj) {
      if (!Array.isArray(obj[kid.name]) || obj[kid.name].__single) obj[kid.name] = [obj[kid.name]];
      obj[kid.name].push(v);
    } else obj[kid.name] = v;
  }
  return obj;
}

export function parseXml(xml) {
  const root = { name: '#root', kids: [], text: '' };
  const stack = [root];
  for (const m of String(xml).matchAll(TOKEN)) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) { top.text += m[1]; continue; }           // CDATA
    if (m[6] !== undefined) { top.text += decodeEntities(m[6]); continue; } // text
    if (m[3] === undefined) continue;                                  // comment / processing instruction
    if (m[2] === '/') { if (stack.length > 1) stack.pop(); continue; } // closing tag
    const node = { name: m[3], kids: [], text: '' };
    top.kids.push(node);
    if (m[5] !== '/') stack.push(node);                                // not self-closing
  }
  return root.kids.length ? toValue(root.kids[0]) : '';
}

/** "zero, one or many" → array. '' and null/undefined → []. */
export function arr(x) {
  if (x == null || x === '') return [];
  return Array.isArray(x) ? x : [x];
}

/** Strip invisible direction marks Fedena sprinkles into Arabic/English names. */
export const clean = (s) =>
  (typeof s === 'string' ? s : '').replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim();

/** All leaf strings inside a value (for loosely-shaped fields such as assigned_students). */
export function leafTexts(v) {
  if (v == null) return [];
  if (typeof v === 'string') return v ? [v] : [];
  return Object.values(v).flatMap(leafTexts);
}
