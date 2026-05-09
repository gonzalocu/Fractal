const RSI_PERIOD = 14

/**
 * Calcula RSI usando el método de Wilder (EMA suavizada).
 * Requiere al menos RSI_PERIOD + 1 cierres.
 * Retorna null si no hay suficientes datos.
 */
export function calculateRSI(closes) {
  if (closes.length < RSI_PERIOD + 1) return null

  const changes = []
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1])
  }

  // Primer promedio simple
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < RSI_PERIOD; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= RSI_PERIOD
  avgLoss /= RSI_PERIOD

  // Suavizado de Wilder para el resto
  for (let i = RSI_PERIOD; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (RSI_PERIOD - 1) + gain) / RSI_PERIOD
    avgLoss = (avgLoss * (RSI_PERIOD - 1) + loss) / RSI_PERIOD
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

/**
 * Calcula el RSI en cada punto del array de cierres.
 * Retorna un array del mismo largo que closes (los primeros RSI_PERIOD valores son null).
 */
export function calculateRSIHistory(closes) {
  if (closes.length < RSI_PERIOD + 1) return closes.map(() => null)

  const result = new Array(RSI_PERIOD).fill(null)

  // Warmup: primer promedio simple sobre los primeros RSI_PERIOD cambios
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= RSI_PERIOD; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) avgGain += diff
    else avgLoss += Math.abs(diff)
  }
  avgGain /= RSI_PERIOD
  avgLoss /= RSI_PERIOD

  const toRSI = (ag, al) => (al === 0 ? 100 : 100 - 100 / (1 + ag / al))
  result.push(toRSI(avgGain, avgLoss))

  // Suavizado de Wilder
  for (let i = RSI_PERIOD + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0
    avgGain = (avgGain * (RSI_PERIOD - 1) + gain) / RSI_PERIOD
    avgLoss = (avgLoss * (RSI_PERIOD - 1) + loss) / RSI_PERIOD
    result.push(toRSI(avgGain, avgLoss))
  }

  return result
}

export const OVERBOUGHT = 70
export const OVERSOLD = 30

export function getRSIZone(rsi) {
  if (rsi === null) return 'loading'
  if (rsi >= OVERBOUGHT) return 'overbought'
  if (rsi <= OVERSOLD) return 'oversold'
  return 'neutral'
}

/**
 * Detecta fractalidad: al menos 2 de las 3 temporalidades en la misma zona extrema.
 * Retorna 'overbought' | 'oversold' | null
 */
export function detectFractality(rsiMap) {
  const timeframes = ['1m', '5m', '15m']
  const zones = timeframes.map((tf) => getRSIZone(rsiMap[tf]))

  const overboughtCount = zones.filter((z) => z === 'overbought').length
  const oversoldCount = zones.filter((z) => z === 'oversold').length

  if (overboughtCount >= 2) return 'overbought'
  if (oversoldCount >= 2) return 'oversold'
  return null
}
