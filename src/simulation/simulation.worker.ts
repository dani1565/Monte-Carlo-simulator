/// <reference lib="webworker" />
import { simulate } from './engine'
import type { SimulationParams } from './types'

self.onmessage = (event: MessageEvent<SimulationParams>) => {
  const result = simulate(event.data, (progress) => self.postMessage({ type: 'progress', progress }))
  self.postMessage({ type: 'result', result })
}

export {}
