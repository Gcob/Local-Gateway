import { normalize, parse, sep } from 'path';
import { homedir } from 'os';

function normalizePath(p) {
  const n = normalize(p);
  // normalize preserves trailing sep; strip it for consistent comparison,
  // but never strip root paths (e.g. '/' on POSIX, 'C:\' on Windows)
  const { root } = parse(n);
  return n !== root && n.endsWith(sep) ? n.slice(0, -sep.length) : n;
}

const HOME = normalizePath(homedir());

export function abbreviatePath(p) {
  const raw = String(p ?? '');
  if (!raw) return '';
  const str = normalizePath(raw);
  if (str === HOME) return '~';
  return str.startsWith(HOME + sep) ? `~${str.slice(HOME.length)}` : str;
}
