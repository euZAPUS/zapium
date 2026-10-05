/**
 * Calculadora de tamaño de posición por riesgo. Herramienta EDUCATIVA: no es asesoramiento
 * financiero. Lógica pura, con tests.
 */
export interface RiskInput {
  balance: number;
  riskPct: number;
  entry: number;
  stop: number;
  target?: number;
  /** Comisión total ida y vuelta, en % del valor de la posición */
  feePct?: number;
}
export interface RiskResult {
  direction: 'long' | 'short';
  riskAmount: number;
  stopDistance: number;
  stopPct: number;
  units: number;
  positionValue: number;
  fees: number;
  rr: number | null;
  gain: number | null;
  loss: number;
  warnings: ('exceedsBalance' | 'targetWrongSide')[];
}
export type RiskOutcome =
  | { ok: true; result: RiskResult }
  | { ok: false; error: 'values' | 'stopEqualsEntry' | 'riskRange' };

export function positionSize(i: RiskInput): RiskOutcome {
  const nums = [i.balance, i.riskPct, i.entry, i.stop];
  if (nums.some((n) => !Number.isFinite(n)) || i.balance <= 0 || i.entry <= 0 || i.stop <= 0)
    return { ok: false, error: 'values' };
  if (i.riskPct <= 0 || i.riskPct > 100) return { ok: false, error: 'riskRange' };
  if (i.stop === i.entry) return { ok: false, error: 'stopEqualsEntry' };

  const direction = i.stop < i.entry ? 'long' : 'short';
  const riskAmount = (i.balance * i.riskPct) / 100;
  const stopDistance = Math.abs(i.entry - i.stop);
  const feeRate = (i.feePct ?? 0) / 100;
  // El riesgo incluye la comisión: units · (distancia + entrada · comisión) = riesgo
  const units = riskAmount / (stopDistance + i.entry * feeRate);
  const positionValue = units * i.entry;
  const fees = positionValue * feeRate;
  const warnings: RiskResult['warnings'] = [];
  if (positionValue > i.balance) warnings.push('exceedsBalance');

  let rr: number | null = null;
  let gain: number | null = null;
  if (i.target !== undefined && Number.isFinite(i.target)) {
    const targetOk = direction === 'long' ? i.target > i.entry : i.target < i.entry;
    if (targetOk) {
      gain = units * Math.abs(i.target - i.entry) - fees;
      rr = gain / riskAmount;
    } else warnings.push('targetWrongSide');
  }
  return {
    ok: true,
    result: {
      direction,
      riskAmount,
      stopDistance,
      stopPct: (stopDistance / i.entry) * 100,
      units,
      positionValue,
      fees,
      rr,
      gain,
      loss: riskAmount,
      warnings,
    },
  };
}
