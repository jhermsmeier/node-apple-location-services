var url = require( 'url' )
var https = require( 'https' )
var Pbf = require( 'pbf' )
var LocationServices = module.exports

/**
 * Apple Location Services endpoint URL
 * @type {String}
 * @const
 */
LocationServices.ENDPOINT = 'https://gs-loc.apple.com/clls/wloc'

LocationServices.Header = require( './header' )
LocationServices.Messages = require( './messages' )

LocationServices.post = function( options, callback ) {

  if( options == null || typeof options === 'function' ) {
    throw new Error( 'Missing options' )
  }

  if( typeof callback !== 'function' ) {
    throw new TypeError( 'Callback must be a function' )
  }

  options.endpoint = options.endpoint || LocationServices.ENDPOINT

  var header = new LocationServices.Header( options.header )
  var pbf = new Pbf()

  LocationServices.Messages.Request.write({
    results: options.results == null ?
      Math.max( options.devices.length, 100 ) :
      options.results,
    unknown: options.unknown || 0,
    devices: options.devices || [],
  }, pbf )

  var payload = Buffer.from( pbf.finish() )
  var lengthBuffer = Buffer.alloc( 2 )

  lengthBuffer.writeUInt16BE( payload.length, 0x00 )

  var data = Buffer.concat([ header.write(), lengthBuffer, payload ])

  var httpOptions = Object.assign( url.parse( options.endpoint ), {
    method: 'POST',
    headers: {
      'User-Agent': 'locationd/1756.1.15 CFNetwork/711.5.6 Darwin/14.0.0',
      'Content-Length': Buffer.byteLength( data ),
    }
  })

  var request = https.request( httpOptions, function( response ) {

    if( response.statusCode !== 200 ) {
      return callback( new Error( `HTTP ${response.statusCode}: ${response.statusMessage}` ) )
    }

    var chunks = []

    response.on( 'readable', function() {
      var chunk = null
      while( chunk = this.read() ) {
        chunks.push( chunk )
      }
    })

    response.on( 'end', function() {

      var buffer = Buffer.concat( chunks )
      var pbf = new Pbf( buffer.slice( 10 ) )
      var data = LocationServices.Messages.Response.read( pbf )

      // Coordinates are stored as integers
      for( var i = 0; i < data.devices.length; i++ ) {
        data.devices[i].location.lat = data.devices[i].location.lat * 1e-8
        data.devices[i].location.lon = data.devices[i].location.lon * 1e-8
      }

      callback( null, data )

    })

  })

  request.once( 'error', callback )
  request.write( data )
  request.end()

}

// CoreWLAN channel values
const CW_CHANNEL_BAND = {
  UNKNOWN: 0,
  BAND_2GHZ: 1,
  BAND_5GHZ: 2,
}

const CW_CHANNEL_WIDTH = {
  UNKNOWN: 0,
  WIDTH_20MHZ: 1,
  WIDTH_40MHZ: 2,
  WIDTH_80MHZ: 3,
  WIDTH_160MHZ: 4,
}

const CW_PHY_MODE = {
  NONE: 0,
  MODE_11A: 1,
  MODE_11B: 2,
  MODE_11G: 3,
  MODE_11N: 4,
  MODE_11AC: 5,
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
LocationServices.networkDistance = function networkDistance( network ) {

  // // Typical wireless LAN transmission power in laptops (in dBm)
  // var txPower = 15 // 32 mW = 15 dBm

  // // EIRP for IEEE 802.11n wireless LAN (in dBm)
  // var txPower = 23 // 200 mW = 23 dBm

  // // Calculate received power in W (!) from rssi dBm
  // var recvPower = Math.pow( 10, network.rssi / 10 )

  // Maximal received signal power of wireless network (in dBm)
  // is usually, 100 µW = −10 dBm, the following has been determined by experiment
  var maxRecvPower = -5

  // Bitrate in bps
  var bitRate = 54 * 1e6 // default to 54 Mbps

  // NOTE: Looks like we can only get the mode of the
  // currently active interface at the moment,
  // so this is of no use yet.
  switch( network.mode ) {
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
  var n = 2 + ( network.rssi / network.noise )

  // Signal frequency in Hz (rough number for now)
  // TODO:
  // - Update with accurate frequencies
  // - Combine with channel width & channel number for even more precision (?)
  var f = network.channelBand === CW_CHANNEL_BAND.BAND_5GHZ ?
    5 * 1e6 : 2.4 * 1e6

  // Fade margin (in dBm): Difference in power levels between
  // the actual signal hitting the receiver and the bottom-line minimum signal.
  // Theoretical minimum is -154dBm + 10 * log10(bitrate)
  // NOTE: For some reason this yields utterly shit results when incorporated
  // into the falloff calculation (instead of the noise)
  // I'm probably doing something horribly wrong.
  var fm = -154 + (10 * Math.log10( bitRate ))
  fm = fm - network.rssi

  var pathLoss = 10 * n
  var falloff = maxRecvPower - network.noise - network.rssi - pathLoss * Math.log10(f) + 30 * n - 32.44

  // Distance in meters
  var d = Math.pow( 10, falloff / pathLoss )

  // NOTE: Not sure why, but * 10 delivers more realistic results
  return d * 10

}
