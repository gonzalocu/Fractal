import { useEffect, useRef, useReducer, useCallback, useState } from 'react'
import {
  calculateRSI, calculateRSIHistory,
  calculateSMA, calculateSMAHistory,
  getRSIZone, detectFractality, detectSMACrossover,
} from '../utils/rsi'

export const SYMBOLS = [
  { id: 'BTC',  stream: 'btcusdt',  label: 'Bitcoin',        color: '#f7931a' },
  { id: 'ETH',  stream: 'ethusdt',  label: 'Ethereum',       color: '#627eea' },
  { id: 'BNB',  stream: 'bnbusdt',  label: 'BNB',            color: '#f3ba2f' },
  { id: 'SOL',  stream: 'solusdt',  label: 'Solana',         color: '#9945ff' },
  { id: 'XRP',  stream: 'xrpusdt',  label: 'Ripple',         color: '#346aa9' },
  { id: 'DOGE', stream: 'dogeusdt', label: 'Dogecoin',       color: '#c2a633' },
  { id: 'ADA',  stream: 'adausdt',  label: 'Cardano',        color: '#0033ad' },
  { id: 'AVAX', stream: 'avaxusdt', label: 'Avalanche',      color: '#e84142' },
  { id: 'TRX',  stream: 'trxusdt',  label: 'TRON',           color: '#ef0027' },
  { id: 'LINK', stream: 'linkusdt', label: 'Chainlink',      color: '#2a5ada' },
  { id: 'DOT',  stream: 'dotusdt',  label: 'Polkadot',       color: '#e6007a' },
  { id: 'TON',  stream: 'tonusdt',  label: 'Toncoin',        color: '#0088cc' },
  { id: 'MATIC',stream: 'maticusdt',label: 'Polygon',        color: '#8247e5' },
  { id: 'LTC',  stream: 'ltcusdt',  label: 'Litecoin',       color: '#bfbbbb' },
  { id: 'NEAR', stream: 'nearusdt', label: 'NEAR Protocol',  color: '#00c08b' },
  { id: 'UNI',  stream: 'uniusdt',  label: 'Uniswap',        color: '#ff007a' },
  { id: 'APT',  stream: 'aptusdt',  label: 'Aptos',          color: '#2ecc71' },
  { id: 'SUI',  stream: 'suiusdt',  label: 'Sui',            color: '#4da2ff' },
  { id: 'OP',   stream: 'opusdt',   label: 'Optimism',       color: '#ff0420' },
  { id: 'ARB',  stream: 'arbusdt',  label: 'Arbitrum',       color: '#12aaff' },
]
export const TIMEFRAMES = ['1m', '5m', '15m']

const MAX_CANDLES     = 200
const MAX_RSI_HISTORY = 100
const WS_BASE   = 'wss://stream.binance.com/stream'
const REST_BASE = 'https://api.binance.com/api/v3'

function buildStreamUrl() {
  const streams = SYMBOLS.flatMap((sym) =>
    TIMEFRAMES.map((tf) => `${sym.stream}@kline_${tf}`)
  )
  return `${WS_BASE}?streams=${streams.join('/')}`
}

function emptyTF() {
  return { '1m': null, '5m': null, '15m': null }
}
function emptyTFArr() {
  return { '1m': [], '5m': [], '15m': [] }
}

function buildInitialState() {
  const coins = {}
  for (const sym of SYMBOLS) {
    coins[sym.id] = {
      id: sym.id, label: sym.label, color: sym.color, stream: sym.stream,
      price: null,
      closes:     emptyTFArr(),
      rsi:        emptyTF(),
      sma:        emptyTF(),
      rsiHistory: emptyTFArr(),
      smaHistory: emptyTFArr(),
      zone:       { '1m': 'loading', '5m': 'loading', '15m': 'loading' },
      fractality: null,
    }
  }
  return { coins, alerts: [] }
}

function buildTFUpdate(coin, tf, rsiHistory) {
  const smaHist    = calculateSMAHistory(rsiHistory)
  // Solo valores no-null para la gráfica, capped
  const rsiClean   = rsiHistory.filter((v) => v !== null).slice(-MAX_RSI_HISTORY)
  const smaClean   = smaHist.filter((v) => v !== null).slice(-MAX_RSI_HISTORY)
  const rsiValue   = rsiClean.at(-1) ?? null
  const smaValue   = smaClean.at(-1) ?? null
  const zone       = getRSIZone(rsiValue)
  const newRsi     = { ...coin.rsi, [tf]: rsiValue }
  return {
    rsiHistory: { ...coin.rsiHistory, [tf]: rsiClean },
    smaHistory: { ...coin.smaHistory, [tf]: smaClean },
    rsi:        newRsi,
    sma:        { ...coin.sma, [tf]: smaValue },
    zone:       { ...coin.zone, [tf]: zone },
    fractality: detectFractality(newRsi),
  }
}

function applyKlineUpdate(coin, tf, close, isFinal) {
  const prevCloses = coin.closes[tf]
  const newCloses  = isFinal
    ? [...prevCloses, close].slice(-MAX_CANDLES)
    : prevCloses.length === 0 ? [close] : [...prevCloses.slice(0, -1), close]

  // Recalcula historial RSI completo desde los cierres
  const prevRsiHist = coin.rsiHistory[tf]
  // Modo rápido: solo recalcular el último valor usando calculateRSI
  // (el historial completo ya está cargado, solo appendeamos)
  const rsiValue   = calculateRSI(newCloses)
  const newRsiHist = isFinal
    ? [...prevRsiHist, rsiValue].slice(-MAX_RSI_HISTORY)
    : prevRsiHist.length === 0 ? [rsiValue] : [...prevRsiHist.slice(0, -1), rsiValue]

  const smaHistFull = calculateSMAHistory(newRsiHist)
  const smaClean    = smaHistFull.filter((v) => v !== null)
  const smaValue    = smaClean.at(-1) ?? null

  const zone   = getRSIZone(rsiValue)
  const newRsi = { ...coin.rsi, [tf]: rsiValue }

  return {
    ...coin,
    price:      close,
    closes:     { ...coin.closes,     [tf]: newCloses },
    rsi:        newRsi,
    sma:        { ...coin.sma,        [tf]: smaValue },
    rsiHistory: { ...coin.rsiHistory, [tf]: newRsiHist },
    smaHistory: { ...coin.smaHistory, [tf]: smaClean.slice(-MAX_RSI_HISTORY) },
    zone:       { ...coin.zone,       [tf]: zone },
    fractality: detectFractality(newRsi),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'KLINE_UPDATE': {
      const { coinId, tf, close, isFinal } = action
      const coin = state.coins[coinId]
      if (!coin) return state
      return {
        ...state,
        coins: { ...state.coins, [coinId]: applyKlineUpdate(coin, tf, close, isFinal) },
      }
    }
    case 'LOAD_HISTORY': {
      const { coinId, tf, closes } = action
      const coin = state.coins[coinId]
      if (!coin) return state
      const rsiHistory = calculateRSIHistory(closes)
      const update     = buildTFUpdate(coin, tf, rsiHistory)
      return {
        ...state,
        coins: {
          ...state.coins,
          [coinId]: { ...coin, closes: { ...coin.closes, [tf]: closes }, ...update },
        },
      }
    }
    case 'ADD_ALERT': {
      const alert = { ...action.alert, id: Date.now() + Math.random() }
      return { ...state, alerts: [alert, ...state.alerts].slice(0, 50) }
    }
    case 'CLEAR_ALERTS':
      return { ...state, alerts: [] }
    default:
      return state
  }
}

function findCoinByStream(streamName) {
  return SYMBOLS.find((s) => s.stream === streamName)
}

async function fetchKlines(symbol, interval, limit = MAX_CANDLES) {
  const url = `${REST_BASE}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()).map((k) => parseFloat(k[4]))
}

export function useCryptoRSI() {
  const [state, dispatch]   = useReducer(reducer, null, buildInitialState)
  const [connStatus, setConnStatus] = useState('connecting')
  const wsRef            = useRef(null)
  const reconnectTimer   = useRef(null)
  const alertCooldowns   = useRef({})
  // Para detección de cruces: guardamos el último { rsi, sma } por coin+tf
  const prevRsiSma       = useRef({})

  // ── Pre-carga histórica ────────────────────────────────────
  useEffect(() => {
    const tasks = SYMBOLS.flatMap((sym) =>
      TIMEFRAMES.map((tf) =>
        fetchKlines(sym.stream, tf)
          .then((closes) => dispatch({ type: 'LOAD_HISTORY', coinId: sym.id, tf, closes }))
          .catch((err) => console.warn(`[RSI] historia ${sym.id} ${tf}:`, err))
      )
    )
    Promise.allSettled(tasks)
  }, [])

  // ── Notificaciones ─────────────────────────────────────────
  const notifyUser = useCallback((title, body, tag) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, tag, icon: '/favicon.svg' })
    }
  }, [])

  const fireAlert = useCallback(
    (type, coin, tf, rsi, sma) => {
      const key = `${coin.id}-${tf}-${type}`
      const now = Date.now()
      const COOLDOWN = 5 * 60 * 1000
      if (alertCooldowns.current[key] && now - alertCooldowns.current[key] < COOLDOWN) return
      alertCooldowns.current[key] = now

      let title, body, zone
      if (type === 'cross_up_oversold') {
        title = `🟢 Cruce alcista — ${coin.label} (${tf})`
        body  = `RSI ${rsi.toFixed(1)} cruzó SMA ${sma.toFixed(1)} hacia arriba en sobreventa`
        zone  = 'cross_up'
      } else if (type === 'cross_down_overbought') {
        title = `🔴 Cruce bajista — ${coin.label} (${tf})`
        body  = `RSI ${rsi.toFixed(1)} cruzó SMA ${sma.toFixed(1)} hacia abajo en sobrecompra`
        zone  = 'cross_down'
      } else if (type === 'zone_overbought') {
        title = `🔴 Sobrecompra — ${coin.label} (${tf})`
        body  = `RSI: ${rsi.toFixed(1)}`
        zone  = 'overbought'
      } else {
        title = `🟢 Sobreventa — ${coin.label} (${tf})`
        body  = `RSI: ${rsi.toFixed(1)}`
        zone  = 'oversold'
      }

      const isFractal = coin.fractality !== null
      if (isFractal) body += ' ⚡ FRACTALIDAD'

      dispatch({
        type: 'ADD_ALERT',
        alert: {
          coinId: coin.id, label: coin.label, tf,
          rsi: rsi.toFixed(1),
          sma: sma !== null ? sma.toFixed(1) : null,
          zone, fractality: isFractal,
          time: new Date().toLocaleTimeString('es-ES'),
        },
      })
      notifyUser(title, body, key)
    },
    [notifyUser]
  )

  // ── Detección de cambios de zona y cruces ──────────────────
  const prevZones = useRef({})
  useEffect(() => {
    for (const coin of Object.values(state.coins)) {
      for (const tf of TIMEFRAMES) {
        const zone    = coin.zone[tf]
        const rsi     = coin.rsi[tf]
        const sma     = coin.sma[tf]
        const prevKey = `${coin.id}-${tf}`

        // — Alerta de zona RSI (entrada) —
        if (zone !== prevZones.current[prevKey] && (zone === 'overbought' || zone === 'oversold')) {
          fireAlert(zone === 'overbought' ? 'zone_overbought' : 'zone_oversold', coin, tf, rsi, sma ?? 0)
        }
        prevZones.current[prevKey] = zone

        // — Alerta de cruce SMA —
        const prev = prevRsiSma.current[prevKey]
        const curr = { rsi, sma }
        const crossType = detectSMACrossover(prev, curr)
        if (crossType) {
          fireAlert(crossType, coin, tf, rsi, sma)
        }
        prevRsiSma.current[prevKey] = curr
      }
    }
  }, [state.coins, fireAlert])

  // ── WebSocket ──────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    setConnStatus('connecting')
    const ws = new WebSocket(buildStreamUrl())
    wsRef.current = ws

    ws.onopen    = () => setConnStatus('connected')
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (!msg.data?.k) return
        const kline = msg.data.k
        const sym   = findCoinByStream(msg.stream.split('@')[0])
        if (!sym) return
        dispatch({ type: 'KLINE_UPDATE', coinId: sym.id, tf: kline.i, close: parseFloat(kline.c), isFinal: kline.x })
      } catch (e) { console.warn('[RSI] msg error', e) }
    }
    ws.onclose = () => { setConnStatus('error'); reconnectTimer.current = setTimeout(connect, 3000) }
    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    }
  }, [connect])

  const requestNotifications = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  return {
    coins: Object.values(state.coins),
    alerts: state.alerts,
    clearAlerts: () => dispatch({ type: 'CLEAR_ALERTS' }),
    requestNotifications,
    notificationPermission: 'Notification' in window ? Notification.permission : 'unsupported',
    connStatus,
  }
}
