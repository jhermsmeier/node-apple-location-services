var util = require( 'util' )
var os = require( 'os' )
var options = { depth: null, colors: process.stdin.isTTY }

function inspect( value ) {
  return util.inspect( value, options )
}

inspect.print = function( value ) {
  process.stdout.write( inspect( value ) )
  process.stdout.write( os.EOL )
}

module.exports = inspect
