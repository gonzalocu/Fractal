import { useEffect, useRef, useReducer, useCallback, useState } from 'react'
import { calculateRSI, getRSIZone, detectFractality } from '../utils/rsi'

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

const MAX_CANDLES = 100
// Puerto 443 (WSS estándar) — más compatible con firewalls que 9443
const WS_BASE = 'wss://stream.binance.com/stream'
const REST_BASE = 'https://api.binance.com/api/v3'

function buildStreamUrl() {
  const streams = SYMBOLS.flatMap((sym) =>
    TIMEFRAMES.map((tf) => `${sym.stream}@kline_${tf}`)
  )
  return `${WS_BASE}?streams=${streams.join('/')}`
}

function buildInitialState() {
  const coins = {}
  for (const sym of SYMBOLS) {
    coins[sym.id] = {
      id: sym.id,
      label: sym.label,
      color: sym.color,
      stream: sym.stream,
      price: null,
      closes: { '1m': [], '5m': [], '15m': [] },
      rsi:    { '1m': null, '5m': null, '15m': null },
      zone:   { '1m': 'loading', '5m': 'loading', '15m': 'loading' },
      fractality: null,
    }
  }
  return { coins, alerts: [] }
}

function applyKlineUpdate(coin, tf, close, isFinal) {
  const prev = coin.closes[tf]
  const newCloses = isFinal
    ? [...prev, close].slice(-MAX_CANDLES)
    : prev.length === 0
    ? [close]
    : [...prev.slice(0, -1), close]

  const rsiValue = calculateRSI(newCloses)
  const zone = getRSIZone(rsiValue)
  const newRsi = { ...coin.rsi, [tf]: rsiValue }

  return {
    ...coin,
    price: close,
    closes: { ...coin.closes, [tf]: newCloses },
    rsi: newRsi,
    zone: { ...coin.zone, [tf]: zone },
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
      // action.data = { coinId, tf, closes: number[] }
      const { coinId, tf, closes } = action
      const coin = state.coins[coinId]
      if (!coin) return state
      const rsiValue = calculateRSI(closes)
      const zone = getRSIZone(rsiValue)
      const newRsi = { ...coin.rsi, [tf]: rsiValue }
      const updatedCoin = {
        ...coin,
        closes: { ...coin.closes, [tf]: closes },
        rsi: newRsi,
        zone: { ...coin.zone, [tf]: zone },
        fractality: detectFractality(newRsi),
      }
      return { ...state, coins: { ...state.coins, [coinId]: updatedCoin } }
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

// Obtiene cierres históricos desde la REST API de Binance
async function fetchKlines(symbol, interval, limit = MAX_CANDLES) {
  const url = `${REST_BASE}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  // data[i][4] = precio de cierre
  return data.map((k) => parseFloat(k[4]))
}

export function useCryptoRSI() {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState)
  const [connStatus, setConnStatus] = useState('connecting') // connecting | connected | error
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const alertCooldowns = useRef({})

  // ── Pre-carga histórica ────────────────────────────────────
  useEffect(() => {
    async function loadAllHistory() {
      const tasks = SYMBOLS.flatMap((sym) =>
        TIMEFRAMES.map((tf) =>
          fetchKlines(sym.stream, tf)
            .then((closes) => dispatch({ type: 'LOAD_HISTORY', coinId: sym.id, tf, closes }))
            .catch((err) => console.warn(`[RSI] historia ${sym.id} ${tf}:`, err))
        )
      )
      await Promise.allSettled(tasks)
    }
    loadAllHistory()
  }, [])

  // ── Alertas ────────────────────────────────────────────────
  const notifyUser = useCallback((title, body, tag) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, tag, icon: '/favicon.svg' })
    }
  }, [])

  const checkAndAlert = useCallback(
    (coinId, label, tf, rsi, zone, fractality) => {
      if (zone === 'neutral' || zone === 'loading' || rsi === null) return
      const key = `${coinId}-${tf}-${zone}`
      const now = Date.now()
      const COOLDOWN = 5 * 60 * 1000
      if (alertCooldowns.current[key] && now - alertCooldowns.current[key] < COOLDOWN) return
      alertCooldowns.current[key] = now

      const zoneLabel = zone === 'overbought' ? '🔴 Sobrecompra' : '🟢 Sobreventa'
      dispatch({
        type: 'ADD_ALERT',
        alert: { coinId, label, tf, rsi: rsi.toFixed(1), zone, fractality, time: new Date().toLocaleTimeString('es-ES') },
      })
      notifyUser(
        `${zoneLabel} — ${label} (${tf})`,
        `RSI: ${rsi.toFixed(1)}${fractality ? ' ⚡ FRACTALIDAD' : ''}`,
        key
      )
    },
    [notifyUser]
  )

  const prevZones = useRef({})
  useEffect(() => {
    for (const coin of Object.values(state.coins)) {
      for (const tf of TIMEFRAMES) {
        const zone = coin.zone[tf]
        const prevKey = `${coin.id}-${tf}`
        if (zone !== prevZones.current[prevKey] && (zone === 'overbought' || zone === 'oversold')) {
          checkAndAlert(coin.id, coin.label, tf, coin.rsi[tf], zone, coin.fractality)
        }
        prevZones.current[prevKey] = zone
      }
    }
  }, [state.coins, checkAndAlert])

  // ── WebSocket ──────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }
    setConnStatus('connecting')
    const ws = new WebSocket(buildStreamUrl())
    wsRef.current = ws

    ws.onopen = () => setConnStatus('connected')

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (!msg.data?.k) return
        const kline = msg.data.k
        const streamCoin = findCoinByStream(msg.stream.split('@')[0])
        if (!streamCoin) return
        dispatch({
          type: 'KLINE_UPDATE',
          coinId: streamCoin.id,
          tf: kline.i,
          close: parseFloat(kline.c),
          isFinal: kline.x,
        })
      } catch (e) {
        console.warn('[RSI] mensaje inválido', e)
      }
    }

    ws.onclose = (ev) => {
      setConnStatus('error')
      // Reconectar con backoff: 3 s
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
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
