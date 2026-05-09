import { useEffect, useRef, useReducer, useCallback } from 'react'
import { calculateRSI, getRSIZone, detectFractality } from '../utils/rsi'

const SYMBOLS = [
  { id: 'BTC', stream: 'btcusdt', label: 'Bitcoin', color: '#f7931a' },
  { id: 'ETH', stream: 'ethusdt', label: 'Ethereum', color: '#627eea' },
  { id: 'SOL', stream: 'solusdt', label: 'Solana', color: '#9945ff' },
  { id: 'XRP', stream: 'xrpusdt', label: 'Ripple', color: '#346aa9' },
]
const TIMEFRAMES = ['1m', '5m', '15m']
// Cuántas velas guardamos (mínimo RSI_PERIOD+1 = 15, guardamos más para estabilidad)
const MAX_CANDLES = 100

function buildStreamUrl() {
  const streams = []
  for (const sym of SYMBOLS) {
    for (const tf of TIMEFRAMES) {
      streams.push(`${sym.stream}@kline_${tf}`)
    }
  }
  return `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`
}

// Estado inicial: mapa id -> { closes: {1m:[], 5m:[], 15m:[]}, rsi: {}, price, fractality }
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
      rsi: { '1m': null, '5m': null, '15m': null },
      zone: { '1m': 'loading', '5m': 'loading', '15m': 'loading' },
      fractality: null,
    }
  }
  return { coins, alerts: [] }
}

function reducer(state, action) {
  switch (action.type) {
    case 'KLINE_UPDATE': {
      const { coinId, tf, close, isFinal, price } = action
      const coin = state.coins[coinId]
      if (!coin) return state

      const prevCloses = coin.closes[tf]
      let newCloses

      if (isFinal) {
        // La vela cerró — agrega el cierre definitivo
        newCloses = [...prevCloses, close].slice(-MAX_CANDLES)
      } else {
        // Vela en curso — reemplaza el último provisional o agrega
        if (prevCloses.length === 0) {
          newCloses = [close]
        } else {
          newCloses = [...prevCloses.slice(0, -1), close]
        }
      }

      const rsiValue = calculateRSI(newCloses)
      const zone = getRSIZone(rsiValue)

      const newRsi = { ...coin.rsi, [tf]: rsiValue }
      const newZone = { ...coin.zone, [tf]: zone }
      const fractality = detectFractality(newRsi)

      const updatedCoin = {
        ...coin,
        price: price ?? coin.price,
        closes: { ...coin.closes, [tf]: newCloses },
        rsi: newRsi,
        zone: newZone,
        fractality,
      }

      return {
        ...state,
        coins: { ...state.coins, [coinId]: updatedCoin },
      }
    }
    case 'ADD_ALERT': {
      const alert = { ...action.alert, id: Date.now() + Math.random() }
      return {
        ...state,
        alerts: [alert, ...state.alerts].slice(0, 50),
      }
    }
    case 'CLEAR_ALERTS':
      return { ...state, alerts: [] }
    default:
      return state
  }
}

// Encuentra el coinId por stream name (e.g. "btcusdt")
function findCoinByStream(streamName) {
  return SYMBOLS.find((s) => s.stream === streamName)
}

export function useCryptoRSI() {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState)
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const alertCooldowns = useRef({}) // key: `${coinId}-${tf}-${zone}`, value: timestamp

  const notifyUser = useCallback((title, body, tag) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, tag, icon: '/favicon.svg' })
    }
  }, [])

  const checkAndAlert = useCallback(
    (coinId, label, tf, rsi, zone, fractality) => {
      if (zone === 'neutral' || zone === 'loading' || rsi === null) return

      const cooldownKey = `${coinId}-${tf}-${zone}`
      const now = Date.now()
      const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutos entre alertas iguales

      if (alertCooldowns.current[cooldownKey] && now - alertCooldowns.current[cooldownKey] < COOLDOWN_MS) return
      alertCooldowns.current[cooldownKey] = now

      const zoneLabel = zone === 'overbought' ? '🔴 Sobrecompra' : '🟢 Sobreventa'
      const alertObj = {
        coinId,
        label,
        tf,
        rsi: rsi.toFixed(1),
        zone,
        fractality,
        time: new Date().toLocaleTimeString('es-ES'),
      }

      dispatch({ type: 'ADD_ALERT', alert: alertObj })
      notifyUser(`${zoneLabel} — ${label} (${tf})`, `RSI: ${rsi.toFixed(1)}${fractality ? ' ⚡ FRACTALIDAD' : ''}`, cooldownKey)
    },
    [notifyUser]
  )

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
    }

    const ws = new WebSocket(buildStreamUrl())
    wsRef.current = ws

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (!msg.data || !msg.data.k) return

      const kline = msg.data.k
      const streamCoin = findCoinByStream(msg.stream.split('@')[0])
      if (!streamCoin) return

      const tf = kline.i // interval: '1m', '5m', '15m'
      const close = parseFloat(kline.c)
      const isFinal = kline.x

      dispatch({
        type: 'KLINE_UPDATE',
        coinId: streamCoin.id,
        tf,
        close,
        isFinal,
        price: close,
      })

      // Las alertas se disparan sólo en la vela viva (no sólo al cierre) para detección inmediata
      // pero usamos cooldown para no spamear
    }

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  // Efecto para disparar alertas cuando cambia el estado
  const prevZones = useRef({})
  useEffect(() => {
    for (const coin of Object.values(state.coins)) {
      for (const tf of TIMEFRAMES) {
        const zone = coin.zone[tf]
        const prevKey = `${coin.id}-${tf}`
        const prevZone = prevZones.current[prevKey]

        if (zone !== prevZone && (zone === 'overbought' || zone === 'oversold')) {
          checkAndAlert(coin.id, coin.label, tf, coin.rsi[tf], zone, coin.fractality)
        }
        prevZones.current[prevKey] = zone
      }
    }
  }, [state.coins, checkAndAlert])

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
  }
}

export { TIMEFRAMES, SYMBOLS }
