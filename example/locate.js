var wifi = require( 'wifi-network' )
var trilat = require( 'trilat' )
var LocationServices = require( '..' )
var inspect = require( '../test/inspect' )

// Little helper function to match / filter
// detected networks and retrieved networks
function find( haystack, bssid ) {
  for( var i = 0; i < haystack.length; i++ ) {
    if( haystack[i].bssid === bssid ) return haystack[i]
  }
}

console.info( 'Scanning for WiFi networks...' )

wifi.scan( function( error, networks ) {

  if( error ) {
    console.error( 'Error scanning for WiFi networks: %s', error.message )
    return
  }

  console.info( 'Detected %s networks', networks.length )
  // inspect.print( networks )

  var info = {
    devices: networks,
    // results: networks.length,
    unknown: 0,
  }

  console.info( 'Querying Apple Location Services...' )

  LocationServices.post( info, function( error, data ) {

    if( error ) {
      console.error( 'Error querying Apple Location Services: %s', error.message )
      return
    }

    console.info( 'Received %s results', data.devices.length )
    // inspect.print( data )

    // Filter out results that are nulled;
    // in the case of Apple Location Services that is
    // lat & long being set to -180 (not Null-Island)
    var results = data.devices.filter(( network ) => {
      return network.location.lat !== -180 &&
        network.location.lon !== -180
    })

    console.info( 'Filtered out %s networks without location data', data.devices.length - results.length )

    // Filter out networks we don't see,
    // while attaching our detected wifi-network info
    // to estimate the distance to the router later
    var visible = results.filter(( network ) => {
      network.info = find( networks, network.bssid )
      return !!network.info
    })

    console.info( 'Filtered out %s undetected networks', results.length - visible.length )
    // inspect.print( visible )

    // Create trilateration input matrix in the shape of
    // [ [ X, Y, R ], [ X, Y, R ], ... ] while expanding
    // the values by 1*10^8 to avoid floating point errors
    var input = visible.map(( network ) => {
      return [
        network.location.lon * 1e8,
        network.location.lat * 1e8,
        LocationServices.networkDistance( network.info ) * 1e8
      ]
    })

    console.info( 'Generated trilateration matrix:' )

    function entry( row ) {
      return `  ${ row[0] / 1e8 } | ${ row[1] / 1e8 } | ${ (row[2] / 1e8).toFixed(1) }`
    }

    console.log(`
  lat         | lon         | estimated distance (m)
 -------------|-------------|-----------------------
${input.map(entry).join('\n')}`)

    var position = trilat( input )

    // Put the decimal in the right place again
    position[0] /= 1e8
    position[1] /= 1e8

    console.info( '' )
    console.info( 'Position (lat, lon):', inspect( position.reverse() ) )

  })

})
