import {
  excessKurtosisToStudentTDoF,
  parseFredCsv,
  pricesToSimpleReturns,
  sampleExcessKurtosis,
} from '../src/simulation/tailCalibration.ts'

const series = 'SP500'
const requestedStart = '2016-08-26'
const requestedEnd = '2026-08-24'
const url = new URL('https://fred.stlouisfed.org/graph/fredgraph.csv')
url.searchParams.set('id', series)
url.searchParams.set('cosd', requestedStart)
url.searchParams.set('coed', requestedEnd)

const response = await fetch(url)
if (!response.ok) {
  throw new Error(`FRED request failed: ${response.status} ${response.statusText}`)
}

const observations = parseFredCsv(await response.text())
const returns = pricesToSimpleReturns(observations.map(({ close }) => close))
const excessKurtosis = sampleExcessKurtosis(returns)
const fittedDegreesOfFreedom = excessKurtosisToStudentTDoF(excessKurtosis)

console.log(JSON.stringify({
  source: url.toString(),
  series,
  requestedStart,
  requestedEnd,
  firstObservation: observations.at(0)?.date,
  lastObservation: observations.at(-1)?.date,
  observationCount: observations.length,
  returnCount: returns.length,
  returnConvention: 'simple close-to-close returns between consecutive observed FRED closes',
  excessKurtosisEstimator: 'bias-corrected Fisher sample excess kurtosis',
  excessKurtosis,
  fittedStudentTDegreesOfFreedom: fittedDegreesOfFreedom,
}, null, 2))
