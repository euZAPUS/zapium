/** Calculadora de subredes IPv4 (CIDR). Lógica pura, sin DOM, con tests. */

export interface SubnetInfo {
  ip: string;
  cidr: number;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  hosts: number;
  kind: string;
  maskBits: string;
}
export type SubnetResult =
  { ok: true; info: SubnetInfo } | { ok: false; error: 'format' | 'octet' | 'prefix' };

/** «192.168.1.1» → número sin signo de 32 bits; null si no es una IPv4 válida. */
export function parseIPv4(text: string): number | null {
  const parts = text.trim().split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return null; // sin ceros a la izquierda (evita ambigüedad con octal)
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

export function toIPv4(n: number): string {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
}

export const maskFromCidr = (cidr: number): number =>
  cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;

/** Si es una máscara válida (unos seguidos de ceros) devuelve su prefijo; si no, null. */
export function cidrFromMask(mask: number): number | null {
  for (let c = 0; c <= 32; c++) if (maskFromCidr(c) === mask >>> 0) return c;
  return null;
}

export function describeKind(ip: number): string {
  const a = ip >>> 24;
  const b = (ip >>> 16) & 255;
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'private';
  if (a === 127) return 'loopback';
  if (a === 169 && b === 254) return 'linklocal';
  if (a >= 224 && a <= 239) return 'multicast';
  if (a >= 240) return 'reserved';
  if (a === 0) return 'this';
  return 'public';
}

/** Acepta «192.168.1.10/24» o «192.168.1.10 255.255.255.0». */
export function subnetInfo(input: string): SubnetResult {
  const text = input.trim();
  let ipText: string;
  let cidr: number | null;
  if (text.includes('/')) {
    const [a, b] = text.split('/');
    ipText = a ?? '';
    if (!/^\d{1,2}$/.test(b ?? '')) return { ok: false, error: 'prefix' };
    cidr = Number(b);
  } else {
    const [a, b] = text.split(/\s+/);
    if (!a || !b) return { ok: false, error: 'format' };
    ipText = a;
    const m = parseIPv4(b);
    cidr = m === null ? null : cidrFromMask(m);
    if (cidr === null) return { ok: false, error: 'prefix' };
  }
  const ip = parseIPv4(ipText);
  if (ip === null) return { ok: false, error: /^\d+(\.\d+){3}$/.test(ipText) ? 'octet' : 'format' };
  if (cidr < 0 || cidr > 32) return { ok: false, error: 'prefix' };

  const mask = maskFromCidr(cidr);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const hosts = cidr === 32 ? 1 : cidr === 31 ? 2 : 2 ** (32 - cidr) - 2;
  const firstHost = cidr >= 31 ? network : network + 1;
  const lastHost = cidr >= 31 ? broadcast : broadcast - 1;
  return {
    ok: true,
    info: {
      ip: toIPv4(ip),
      cidr,
      mask: toIPv4(mask),
      wildcard: toIPv4(~mask >>> 0),
      network: toIPv4(network),
      broadcast: toIPv4(broadcast),
      firstHost: toIPv4(firstHost),
      lastHost: toIPv4(lastHost),
      hosts,
      kind: describeKind(ip),
      maskBits: [24, 16, 8, 0]
        .map((s) => ((mask >>> s) & 255).toString(2).padStart(8, '0'))
        .join('.'),
    },
  };
}

export interface SubSubnet {
  network: string;
  cidr: number;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  hosts: number;
}

/** Divide una red en subredes de prefijo `newCidr` (máx. `limit` resultados). */
export function splitSubnet(
  network: string,
  cidr: number,
  newCidr: number,
  limit = 32,
): SubSubnet[] {
  const base = parseIPv4(network);
  if (base === null || newCidr <= cidr || newCidr > 30) return [];
  const size = 2 ** (32 - newCidr);
  const count = Math.min(2 ** (newCidr - cidr), limit);
  const out: SubSubnet[] = [];
  for (let i = 0; i < count; i++) {
    const net = (((base & maskFromCidr(cidr)) >>> 0) + i * size) >>> 0;
    const bc = (net + size - 1) >>> 0;
    out.push({
      network: toIPv4(net),
      cidr: newCidr,
      firstHost: toIPv4(net + 1),
      lastHost: toIPv4(bc - 1),
      broadcast: toIPv4(bc),
      hosts: size - 2,
    });
  }
  return out;
}
