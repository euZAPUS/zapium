// Tests de la lógica del laboratorio. Ejecutar con: pnpm test  (Node ≥ 22.18 quita los tipos de los .ts)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIPv4,
  toIPv4,
  subnetInfo,
  splitSubnet,
  cidrFromMask,
  maskFromCidr,
} from './subnet.ts';
import {
  parseInt32,
  toggleBit,
  not,
  shl,
  shrLogical,
  shrArithmetic,
  swapBytes,
  popcount,
  formats,
  xor,
} from './bits.ts';
import { positionSize } from './risk.ts';

test('parseIPv4 válido e inválido', () => {
  assert.equal(parseIPv4('192.168.1.1'), 3232235777);
  assert.equal(toIPv4(3232235777), '192.168.1.1');
  for (const bad of ['1.2.3', '256.1.1.1', '1.2.3.04', 'a.b.c.d', '1.2.3.4.5', ''])
    assert.equal(parseIPv4(bad), null, bad);
});

test('máscara ↔ prefijo', () => {
  assert.equal(toIPv4(maskFromCidr(24)), '255.255.255.0');
  assert.equal(toIPv4(maskFromCidr(0)), '0.0.0.0');
  assert.equal(cidrFromMask(parseIPv4('255.255.240.0')), 20);
  assert.equal(cidrFromMask(parseIPv4('255.0.255.0')), null);
});

test('subnetInfo /24 y máscara larga', () => {
  const r = subnetInfo('192.168.1.130/26');
  assert.ok(r.ok);
  assert.equal(r.info.network, '192.168.1.128');
  assert.equal(r.info.broadcast, '192.168.1.191');
  assert.equal(r.info.firstHost, '192.168.1.129');
  assert.equal(r.info.lastHost, '192.168.1.190');
  assert.equal(r.info.hosts, 62);
  assert.equal(r.info.kind, 'private');
  const m = subnetInfo('10.0.0.5 255.0.0.0');
  assert.ok(m.ok);
  assert.equal(m.info.cidr, 8);
  assert.equal(m.info.hosts, 16777214);
});

test('subnetInfo casos límite /31 /32 /0 y errores', () => {
  assert.equal(subnetInfo('10.0.0.1/32').info.hosts, 1);
  const p2p = subnetInfo('10.0.0.0/31').info;
  assert.equal(p2p.hosts, 2);
  assert.equal(p2p.firstHost, '10.0.0.0');
  assert.equal(p2p.lastHost, '10.0.0.1');
  assert.equal(subnetInfo('0.0.0.0/0').info.hosts, 4294967294);
  assert.equal(subnetInfo('1.2.3.4/33').ok, false);
  assert.equal(subnetInfo('300.1.1.1/24').error, 'octet');
  assert.equal(subnetInfo('hola').ok, false);
  assert.equal(subnetInfo('8.8.8.8/24').info.kind, 'public');
  assert.equal(subnetInfo('127.0.0.1/8').info.kind, 'loopback');
});

test('splitSubnet', () => {
  const s = splitSubnet('192.168.0.0', 24, 26);
  assert.equal(s.length, 4);
  assert.equal(s[1].network, '192.168.0.64');
  assert.equal(s[3].broadcast, '192.168.0.255');
  assert.equal(s[0].hosts, 62);
  assert.deepEqual(splitSubnet('10.0.0.0', 24, 24), []);
  assert.equal(splitSubnet('10.0.0.0', 8, 20).length, 32); // limitado
});

test('bits: parseo y formatos', () => {
  assert.equal(parseInt32('255'), 255);
  assert.equal(parseInt32('0xFF'), 255);
  assert.equal(parseInt32('0b1010'), 10);
  assert.equal(parseInt32('-1'), 0xffffffff);
  assert.equal(parseInt32('4294967296'), null);
  assert.equal(parseInt32('xyz'), null);
  const f = formats(0xdeadbeef);
  assert.equal(f.hex, '0xDEADBEEF');
  assert.equal(f.signed, '-559038737');
  assert.equal(f.binary, '11011110 10101101 10111110 11101111');
});

test('bits: operaciones', () => {
  assert.equal(toggleBit(0, 31), 0x80000000);
  assert.equal(not(0), 0xffffffff);
  assert.equal(shl(0x80000000, 1), 0);
  assert.equal(shrLogical(0x80000000, 1), 0x40000000);
  assert.equal(shrArithmetic(0x80000000, 1), 0xc0000000);
  assert.equal(swapBytes(0x12345678), 0x78563412);
  assert.equal(popcount(0xff), 8);
  assert.equal(xor(0b1100, 0b1010), 0b0110);
});

test('riesgo: largo, corto, comisión y avisos', () => {
  const r = positionSize({ balance: 10000, riskPct: 1, entry: 100, stop: 95, target: 115 });
  assert.ok(r.ok);
  assert.equal(r.result.direction, 'long');
  assert.equal(r.result.riskAmount, 100);
  assert.equal(r.result.units, 20);
  assert.equal(r.result.positionValue, 2000);
  assert.equal(r.result.rr, 3);
  const s = positionSize({ balance: 10000, riskPct: 2, entry: 50, stop: 55 });
  assert.equal(s.result.direction, 'short');
  assert.equal(s.result.units, 40);
  const bad = positionSize({ balance: 1000, riskPct: 1, entry: 100, stop: 99.5, target: 90 });
  assert.ok(bad.result.warnings.includes('targetWrongSide'));
  assert.ok(bad.result.warnings.includes('exceedsBalance'));
  const fee = positionSize({ balance: 10000, riskPct: 1, entry: 100, stop: 95, feePct: 0.1 });
  assert.ok(Math.abs(fee.result.units * 5 + fee.result.fees - 100) < 1e-9);
  assert.equal(
    positionSize({ balance: 1000, riskPct: 1, entry: 100, stop: 100 }).error,
    'stopEqualsEntry',
  );
  assert.equal(positionSize({ balance: -1, riskPct: 1, entry: 1, stop: 2 }).error, 'values');
  assert.equal(positionSize({ balance: 1000, riskPct: 150, entry: 1, stop: 2 }).error, 'riskRange');
});
