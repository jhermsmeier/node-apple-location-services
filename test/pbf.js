/* global describe, specify */

import assert from 'assert'
import Pbf from 'pbf'
import ALS from '../lib/location.js'

describe('Messages', function () {
  specify('Messages.Request.read( pbf )', function () {
    const data = Buffer.from('12130a1162343a35643a35303a39343a33393a623312120a1039383a313a61373a65363a38353a373018002064', 'hex')
    const pbf = new Pbf(data)
    const result = ALS.Messages.Request.read(pbf)
    const expected = {
      devices: [
        { bssid: 'b4:5d:50:94:39:b3', location: null, channel: 0 },
        { bssid: '98:1:a7:e6:85:70', location: null, channel: 0 }
      ],
      results: 100,
      unknown: 0
    }
    assert.deepEqual(result, expected)
  })

  specify.skip('Messages.Request.write( data )', function () {
    const data = {
      devices: [
        { bssid: 'b4:5d:50:94:39:b3', location: null, channel: 0 },
        { bssid: '98:1:a7:e6:85:70', location: null, channel: 0 }
      ],
      results: 100,
      unknown: 0
    }
    const pbf = new Pbf()
    const expected = Buffer.from('12130a1162343a35643a35303a39343a33393a623312120a1039383a313a61373a65363a38353a373018002064', 'hex')
    ALS.Messages.Request.write(data, pbf)
    const result = Buffer.from(pbf.finish())
    assert.deepEqual(result, expected)
  })
})

// var data = Buffer.from( '12130a1162343a35643a35303a39343a33393a623312120a1039383a313a61373a65363a38353a373018002064', 'hex' )
// var pbf = new Pbf( data )
// var result = ALS.Messages.Request.read( pbf )

// console.log( inspect( pbf ) )
// console.log( inspect( result ) )

// var request = new Pbf()

// ALS.Messages.Request.write({
//   devices: [
//     { bssid: 'b4:5d:50:94:39:b3' },
//     { bssid: '98:1:a7:e6:85:70' },
//   ],
//   results: 100,
//   something: 0,
// }, request )

// var buffer = Buffer.from( request.finish() )
// console.log( inspect( buffer ) )
