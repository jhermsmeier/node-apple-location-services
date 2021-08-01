import wifi from 'wifi-network'
import { promisify } from 'util'
import trilat from 'trilat'
import LocationServices from '../lib/location.js'
import inspect from '../test/inspect.js'

const scanWiFi = promisify(wifi.scan)

// Little helper function to match / filter
// detected networks and retrieved networks
function find (haystack, bssid) {
  for (let i = 0; i < haystack.length; i++) {
    if (haystack[i].bssid === bssid) return haystack[i]
  }
}

console.info('Scanning for WiFi networks...')
const networks = await scanWiFi()

console.info('Detected %s networks', networks.length)
console.log(networks)

const info = {
  devices: networks,
  // results: networks.length,
  unknown: 0
}

console.info('Querying Apple Location Services...')

const data = await LocationServices.post(info)

console.info('Received %s results', data.devices.length)
// inspect.print( data )

// Filter out results that are nulled;
// in the case of Apple Location Services that is
// lat & long being set to -180 (not Null-Island)
const results = data.devices.filter((device) => {
  return device.location.lat !== -180 &&
    device.location.lon !== -180
})

console.info('Filtered out %s networks without location data', data.devices.length - results.length)

// Filter out networks we don't see,
// while attaching our detected wifi-network info
// to estimate the distance to the router later
const visible = results.filter(network => find(networks, network.bssid))

console.info('Filtered out %s undetected networks', results.length - visible.length)
// inspect.print( visible )

// Create trilateration input matrix in the shape of
// [ [ X, Y, R ], [ X, Y, R ], ... ] while expanding
// the values by 1*10^8 to avoid floating point errors
const input = visible.map((network) => {
  return [
    network.location.lon * 1e8,
    network.location.lat * 1e8,
    LocationServices.networkDistance(network.bssid) * 1e8
  ]
})

console.info('Generated trilateration matrix:')

function entry (row) {
  return `  ${row[0] / 1e8} | ${row[1] / 1e8} | ${(row[2] / 1e8).toFixed(1)}`
}

console.table([
  ['lat', 'lon', 'estimated distance (m)'],
  ...input
])

const position = trilat(input)

// Put the decimal in the right place again
position[0] /= 1e8
position[1] /= 1e8

console.info('')
console.info('Position (lat, lon):', inspect(position.reverse()))
