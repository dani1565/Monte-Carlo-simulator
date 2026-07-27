import { useEffect, useRef } from 'react'
import type { LeverageResult } from '../simulation/types'

const colors = ['#51e5b4', '#5da9ff', '#f5c15d', '#b989ff', '#ff7a81']

interface ChartProps {
  results: LeverageResult[]
  selected: number
}

function setupCanvas(canvas: HTMLCanvasElement) {
  const ratio = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * ratio
  canvas.height = rect.height * ratio
  const context = canvas.getContext('2d')!
  context.scale(ratio, ratio)
  return { context, width: rect.width, height: rect.height }
}

export function PathChart({ results, selected }: ChartProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current || !results.length) return
    const { context: ctx, width, height } = setupCanvas(ref.current)
    const pad = { top: 22, right: 58, bottom: 36, left: 20 }
    const allPoints = results.flatMap((result) => result.timeline.flatMap((point) => [point.p5, point.p95, point.mean]))
    const maximum = Math.max(2, ...allPoints.filter(Number.isFinite))
    const minLog = -2
    const maxLog = Math.log10(maximum)
    const x = (year: number) => pad.right + (year / results[0].timeline.at(-1)!.year) * (width - pad.right - pad.left)
    const y = (value: number) => pad.top + ((maxLog - Math.log10(Math.max(value, 0.01))) / (maxLog - minLog)) * (height - pad.top - pad.bottom)

    ctx.clearRect(0, 0, width, height)
    ctx.font = '11px Heebo, sans-serif'
    ctx.textAlign = 'right'
    ctx.strokeStyle = '#263532'
    ctx.fillStyle = '#79908a'
    for (let step = minLog; step <= maxLog; step += 1) {
      const position = y(10 ** step)
      ctx.beginPath(); ctx.moveTo(pad.right, position); ctx.lineTo(width - pad.left, position); ctx.stroke()
      ctx.fillText(formatMultiple(10 ** step), pad.right - 8, position + 4)
    }

    results.forEach((result, resultIndex) => {
      const color = colors[Math.max(0, result.leverage - 1) % colors.length]
      const points = result.timeline
      ctx.globalAlpha = result.leverage === selected ? 1 : 0.42
      ctx.fillStyle = `${color}18`
      ctx.beginPath()
      points.forEach((point, index) => index ? ctx.lineTo(x(point.year), y(point.p75)) : ctx.moveTo(x(point.year), y(point.p75)))
      [...points].reverse().forEach((point) => ctx.lineTo(x(point.year), y(point.p25)))
      ctx.closePath(); ctx.fill()
      drawLine(ctx, points.map((point) => [x(point.year), y(point.median)]), color, 2.4)
      drawLine(ctx, points.map((point) => [x(point.year), y(point.mean)]), color, 1.2, [5, 4])
      if (resultIndex === 0 || result.leverage === selected) {
        result.samples.slice(0, 12).forEach((sample) => {
          const until = sample.ruined ? Math.min(sample.values.length, Math.ceil(sample.ruinYear ?? sample.values.length)) : sample.values.length
          drawLine(ctx, sample.values.slice(0, until).map((value, index) => [x(index), y(value)]), sample.ruined ? '#ff6b72' : color, .55)
        })
      }
    })
    ctx.globalAlpha = 1
    ctx.fillStyle = '#79908a'; ctx.textAlign = 'center'
    for (let year = 0; year <= results[0].timeline.at(-1)!.year; year += Math.max(1, Math.ceil(results[0].timeline.at(-1)!.year / 5))) {
      ctx.fillText(`${year}`, x(year), height - 12)
    }
  }, [results, selected])
  return <canvas ref={ref} className="chart-canvas" aria-label="גרף מסלולי ההשקעה לאורך זמן" />
}

export function DistributionChart({ results, selected }: ChartProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current || !results.length) return
    const result = results.find((item) => item.leverage === selected) ?? results[0]
    const { context: ctx, width, height } = setupCanvas(ref.current)
    const pad = { top: 20, right: 45, bottom: 42, left: 20 }
    const bins = result.histogram
    const maxCount = Math.max(1, result.ruinedCount, ...bins.map((bin) => bin.count))
    const totalBars = bins.length + 1
    const available = width - pad.right - pad.left
    const barWidth = available / totalBars
    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = '#263532'; ctx.fillStyle = '#79908a'; ctx.font = '11px Heebo, sans-serif'; ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i += 1) {
      const y = pad.top + (i / 4) * (height - pad.top - pad.bottom)
      ctx.beginPath(); ctx.moveTo(pad.right, y); ctx.lineTo(width - pad.left, y); ctx.stroke()
      ctx.fillText(`${Math.round(maxCount * (1 - i / 4))}`, pad.right - 7, y + 4)
    }
    const drawBar = (index: number, count: number, color: string) => {
      const barHeight = (count / maxCount) * (height - pad.top - pad.bottom)
      ctx.fillStyle = color
      ctx.fillRect(pad.right + index * barWidth + 1, height - pad.bottom - barHeight, Math.max(1, barWidth - 2), barHeight)
    }
    drawBar(0, result.ruinedCount, '#ff6b72')
    bins.forEach((bin, index) => drawBar(index + 1, bin.count, '#51e5b4'))
    ctx.fillStyle = '#9aaba7'; ctx.textAlign = 'center'
    ctx.fillText('חורבן', pad.right + barWidth / 2, height - 18)
    if (bins.length) {
      ctx.fillText(formatMultiple(bins[0].from), pad.right + barWidth * 1.5, height - 18)
      ctx.fillText(formatMultiple(bins.at(-1)!.to), width - pad.left - barWidth / 2, height - 18)
    }
  }, [results, selected])
  return <canvas ref={ref} className="chart-canvas histogram" aria-label="התפלגות השווי הסופי" />
}

function drawLine(ctx: CanvasRenderingContext2D, points: number[][], color: string, width: number, dash: number[] = []) {
  if (!points.length) return
  ctx.beginPath(); ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = width
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
  ctx.stroke(); ctx.setLineDash([])
}

function formatMultiple(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M×`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K×`
  if (value >= 10) return `${value.toFixed(0)}×`
  return `${value.toFixed(value < 1 ? 2 : 1)}×`
}
