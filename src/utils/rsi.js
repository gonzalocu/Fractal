export const RSI_PERIOD = 14
export const SMA_PERIOD = 9
export const OVERBOUGHT  = 70
export const OVERSOLD    = 30

// ── RSI ──────────────────────────────────────────────────────

export function calculateRSI(closes) {
  if (closes.length < RSI_PERIOD + 1) return null

  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= RSI_PERIOD; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d)
  }
  avgGain /= RSI_PERIOD
  avgLoss /= RSI_PERIOD

  for (let i = RSI_PERIOD + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    avgGain = (avgGain * (RSI_PERIOD - 1) + (d > 0 ? d : 0)) / RSI_PERIOD
    avgLoss = (avgLoss * (RSI_PERIOD - 1) + (d < 0 ? Math.abs(d) : 0)) / RSI_PERIOD
  }

  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
}

/**
 * Calcula RSI en cada vela. Retorna array alineado con closes
 * (los primeros RSI_PERIOD elementos son null).
 */
export function calculateRSIHistory(closes) {
  if (closes.length < RSI_PERIOD + 1) return closes.map(() => null)

  const result = new Array(RSI_PERIOD).fill(null)
  let avgGain = 0, avgLoss = 0

  for (let i = 1; i <= RSI_PERIOD; i++) {
    const d = closes[i] - closes[i - 1]
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d)
  }
  avgGain /= RSI_PERIOD
  avgLoss /= RSI_PERIOD

  const toRSI = (ag, al) => (al === 0 ? 100 : 100 - 100 / (1 + ag / al))
  result.push(toRSI(avgGain, avgLoss))

  for (let i = RSI_PERIOD + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    avgGain = (avgGain * (RSI_PERIOD - 1) + (d > 0 ? d : 0)) / RSI_PERIOD
    avgLoss = (avgLoss * (RSI_PERIOD - 1) + (d < 0 ? Math.abs(d) : 0)) / RSI_PERIOD
    result.push(toRSI(avgGain, avgLoss))
  }

  return result
}

// ── SMA sobre RSI ─────────────────────────────────────────────

/**
 * Calcula la SMA de `period` periodos sobre un array de valores.
 * Los primeros (period-1) elementos son null.
 */
export function calculateSMAHistory(values, period = SMA_PERIOD) {
  return values.map((_, i) => {
    if (i < period - 1) return null
    const slice = values.slice(i - period + 1, i + 1)
    if (slice.some((v) => v === null)) return null
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

export function calculateSMA(values, period = SMA_PERIOD) {
  const hist = calculateSMAHistory(values, period)
  return hist.at(-1) ?? null
}

// ── Zona ──────────────────────────────────────────────────────

export function getRSIZone(rsi) {
  if (rsi === null) return 'loading'
  if (rsi >= OVERBOUGHT) return 'overbought'
  if (rsi <= OVERSOLD)   return 'oversold'
  return 'neutral'
}

// ── Fractalidad ───────────────────────────────────────────────

export function detectFractality(rsiMap) {
  const zones = ['1m', '5m', '15m'].map((tf) => getRSIZone(rsiMap[tf]))
  const ob = zones.filter((z) => z === 'overbought').length
  const os = zones.filter((z) => z === 'oversold').length
  if (ob >= 2) return 'overbought'
  if (os >= 2) return 'oversold'
  return null
}

// ── Detección de cruce RSI / SMA ──────────────────────────────

/**
 * Detecta cruce de RSI sobre SMA en zona extrema.
 * prev/curr: { rsi, sma }
 * Retorna 'cross_up_oversold' | 'cross_down_overbought' | null
 */
export function detectSMACrossover(prev, curr) {
  if (!prev || !curr) return null
  if (prev.rsi === null || prev.sma === null) return null
  if (curr.rsi === null || curr.sma === null) return null

  const crossedUp   = prev.rsi <= prev.sma && curr.rsi > curr.sma
  const crossedDown = prev.rsi >= prev.sma && curr.rsi < curr.sma

  // Cruce alcista en sobreventa: RSI sube por encima de la SMA mientras RSI < 35
  if (crossedUp   && curr.rsi <= OVERSOLD + 5)   return 'cross_up_oversold'
  // Cruce bajista en sobrecompra: RSI cae por debajo de la SMA mientras RSI > 65
  if (crossedDown && curr.rsi >= OVERBOUGHT - 5) return 'cross_down_overbought'

  return null
}
