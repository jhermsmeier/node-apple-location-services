import url from 'url'
import https from 'https'
import Pbf from 'pbf'
import Header from './header.js'
import * as Messages from './messages.js'

const LocationServices = {}

/**
 * Apple Location Services endpoint URL
 * @type {String}
 */
LocationServices.ENDPOINT = 'https://gs-loc.apple.com/clls/wloc'

LocationServices.Header = Header
LocationServices.Messages = Messages

/**
 * @typedef {Object} Result
 * @property {Array<Device>} devices
 * @property {Array<Location>} locations
 */

/**
 * @typedef {Object} Device
 * @property {string} bssid
 * @property {Object} location
 * @property {number} location.lat
 * @property {number} location.lon
 */

/**
 * @returns {Promise<Result>}
 */
LocationServices.post = async function (options = {}) {
  options.endpoint = options.endpoint || LocationServices.ENDPOINT

  const header = new Header(options.header)
  const pbf = new Pbf()

  LocationServices.Messages.Request.write({
    results: options.results == null
      ? Math.max(options.devices.length, 100)
      : options.results,
    unknown: options.unknown || 0,
    devices: options.devices || []
  }, pbf)

  const payload = Buffer.from(pbf.finish())
  const lengthBuffer = Buffer.alloc(2)

  lengthBuffer.writeUInt16BE(payload.length, 0x00)

  const data = Buffer.concat([header.write(), lengthBuffer, payload])

  // TODO: 'url.parse' was deprecated since v11.0.0. Use 'url.URL' constructor instead.
  const httpOptions = Object.assign(url.parse(options.endpoint), {
    method: 'POST',
    headers: {
      'User-Agent': 'location/1756.1.15 CFNetwork/711.5.6 Darwin/14.0.0',
      'Content-Length': Buffer.byteLength(data)
    }
  })

  return new Promise((resolve, reject) => {
    const request = https.request(httpOptions, async response => {
      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
      }

      const chunks = []

      for await (const chunk of response) {
        chunks.push(chunk)
      }

      const buffer = Buffer.concat(chunks)
      const pbf = new Pbf(buffer.slice(10))
      const data = LocationServices.Messages.Response.read(pbf)

      // Coordinates are stored as integers
      for (let i = 0; i < data.devices.length; i++) {
        data.devices[i].location.lat = data.devices[i].location.lat * 1e-8
        data.devices[i].location.lon = data.devices[i].location.lon * 1e-8
      }

      resolve(data)
    })

    request.once('error', reject)
    request.end(data)
  })
}

// CoreWLAN channel values
const CW_CHANNEL_BAND = {
  UNKNOWN: 0,
  BAND_2GHZ: 1,
  BAND_5GHZ: 2
}

// TODO: CW_CHANNEL_WIDTH is assigned but never used
const CW_CHANNEL_WIDTH = {
  UNKNOWN: 0,
  WIDTH_20MHZ: 1,
  WIDTH_40MHZ: 2,
  WIDTH_80MHZ: 3,
  WIDTH_160MHZ: 4
}

const CW_PHY_MODE = {
  NONE: 0,
  MODE_11A: 1,
  MODE_11B: 2,
  MODE_11G: 3,
  MODE_11N: 4,
  MODE_11AC: 5
}

// This function attempts to estimate the distance in meters to an access point
// NOTE: The math in here is probably an abomination, specific to my macbook,
// and horribly broken, but it kind of works (as in the results are somewhat okay)
// See https://electronics.stackexchange.com/questions/83354/calculate-distance-from-rssi
// TODO:
// - [ ] Turn this into a npm package
// - [ ] Maybe factor in channel width?
// - [x] Factor in aggregate noise measurement
// - [x] Exploration: Estimate path-loss exponent based on signal-to-noise ratio
// - [ ] Exploration: Temporal recursive trilateration
//       (trilaterate between last n trilats from locationd response)
LocationServices.networkDistance = function networkDistance (network) {
  // // Typical wireless LAN transmission power in laptops (in dBm)
  // var txPower = 15 // 32 mW = 15 dBm

  // // EIRP for IEEE 802.11n wireless LAN (in dBm)
  // var txPower = 23 // 200 mW = 23 dBm

  // // Calculate received power in W (!) from rssi dBm
  // var recvPower = Math.pow( 10, network.rssi / 10 )

  // Maximal received signal power of wireless network (in dBm)
  // is usually, 100 µW = −10 dBm, the following has been determined by experiment
  const maxRecvPower = -5

  // Bitrate in bps
  let bitRate = 54 * 1e6 // default to 54 Mbps

  // NOTE: Looks like we can only get the mode of the
  // currently active interface at the moment,
  // so this is of no use yet.
  switch (network.mode) {
    case CW_PHY_MODE.MODE_11A: bitRate = 54 * 1e6; break
    case CW_PHY_MODE.MODE_11B: bitRate = 11 * 1e6; break
    case CW_PHY_MODE.MODE_11G: bitRate = 54 * 1e6; break
    case CW_PHY_MODE.MODE_11N: bitRate = 150 * 1e6; break
    case CW_PHY_MODE.MODE_11AC: bitRate = 780 * 1e6; break
    default: bitRate = 54 * 1e6; break // 54 Mbps
  }

  // // Propagation path-loss exponent (2 ^= free space);
  // // Usually between 2.7 and 4.3
  // var n = 2.7

  // Exploration: Estimate path-loss exponent based on signal-to-noise ratio
  // NOTE: This seems to yield more reasonable values for the distance. Sweet!
  const n = 2 + (network.rssi / network.noise)

  // Signal frequency in Hz (rough number for now)
  // TODO:
  // - Update with accurate frequencies
  // - Combine with channel width & channel number for even more precision (?)
  const f = network.channelBand === CW_CHANNEL_BAND.BAND_5GHZ
    ? 5 * 1e6
    : 2.4 * 1e6

  // Fade margin (in dBm): Difference in power levels between
  // the actual signal hitting the receiver and the bottom-line minimum signal.
  // Theoretical minimum is -154dBm + 10 * log10(bitrate)
  // NOTE: For some reason this yields utterly shit results when incorporated
  // into the falloff calculation (instead of the noise)
  // I'm probably doing something horribly wrong.
  let fm = -154 + (10 * Math.log10(bitRate))
  fm = fm - network.rssi // TODO: fm is assigned but never used

  const pathLoss = 10 * n
  const falloff = maxRecvPower - network.noise - network.rssi - pathLoss * Math.log10(f) + 30 * n - 32.44

  // Distance in meters
  const d = Math.pow(10, falloff / pathLoss)

  // NOTE: Not sure why, but * 10 delivers more realistic results
  return d * 10
}

export default LocationServices
