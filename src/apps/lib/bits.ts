/** Utilidades de enteros de 32 bits para el visor de bits. Lógica pura, con tests. */

export const U32 = 0xffffffff;
export const toU32 = (n: number): number => n >>> 0;
export const toI32 = (n: number): number => n | 0;

/** Acepta decimal (también negativo), 0x… hexadecimal, 0b… binario y 0o… octal. */
export function parseInt32(text: string): number | null {
  const t = text.trim().replace(/_/g, '').toLowerCase();
  if (!t) return null;
  let v: number;
  if (/^-?\d+$/.test(t)) v = Number(t);
  else if (/^0x[0-9a-f]+$/.test(t)) v = parseInt(t.slice(2), 16);
  else if (/^0b[01]+$/.test(t)) v = parseInt(t.slice(2), 2);
  else if (/^0o[0-7]+$/.test(t)) v = parseInt(t.slice(2), 8);
  else return null;
  if (!Number.isFinite(v) || v > U32 || v < -(2 ** 31)) return null;
  return toU32(v);
}

export const bit = (n: number, i: number): 0 | 1 => ((n >>> i) & 1) as 0 | 1;
export const toggleBit = (n: number, i: number): number => toU32(n ^ (1 << i));
export const not = (n: number): number => toU32(~n);
export const shl = (n: number, k = 1): number => toU32(n << k);
export const shrLogical = (n: number, k = 1): number => toU32(n >>> k);
export const shrArithmetic = (n: number, k = 1): number => toU32(toI32(n) >> k);
export const and = (a: number, b: number): number => toU32(a & b);
export const or = (a: number, b: number): number => toU32(a | b);
export const xor = (a: number, b: number): number => toU32(a ^ b);
export const swapBytes = (n: number): number =>
  toU32(((n & 0xff) << 24) | ((n & 0xff00) << 8) | ((n >>> 8) & 0xff00) | ((n >>> 24) & 0xff));
export const popcount = (n: number): number => {
  let c = 0;
  for (let x = toU32(n); x; x &= x - 1) c++;
  return c;
};

export function formats(n: number) {
  const u = toU32(n);
  return {
    unsigned: String(u),
    signed: String(toI32(u)),
    hex: '0x' + u.toString(16).toUpperCase().padStart(8, '0'),
    octal: '0o' + u.toString(8),
    binary: [24, 16, 8, 0].map((s) => ((u >>> s) & 255).toString(2).padStart(8, '0')).join(' '),
  };
}
