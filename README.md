# Apple Location Services
[![npm](https://img.shields.io/npm/v/apple-location-services.svg?style=flat-square)](https://npmjs.com/package/apple-location-services)
[![npm license](https://img.shields.io/npm/l/apple-location-services.svg?style=flat-square)](https://npmjs.com/package/apple-location-services)
[![npm downloads](https://img.shields.io/npm/dm/apple-location-services.svg?style=flat-square)](https://npmjs.com/package/apple-location-services)
[![build status](https://img.shields.io/travis/jhermsmeier/node-apple-location-services/master.svg?style=flat-square)](https://travis-ci.org/jhermsmeier/node-apple-location-services)

## Install via [npm](https://npmjs.com)

```sh
$ npm install --save apple-location-services
```

## Related modules

- [jhermsmeier](https://github.com/jhermsmeier) / [wifi-network](https://github.com/jhermsmeier/node-wifi-network)
  to get a list of detected wifi networks and signal data

## Usage

```js
import LocationServices from 'apple-location-services'
```

## Example

```
$ node example/locate.js
```

```
Scanning for WiFi networks...
Detected 20 networks
Querying Apple Location Services...
Received 113 results
Filtered out 11 networks without location data
Filtered out 98 undetected networks
Generated trilateration matrix:

[ [ 1341663988, 5249087264, 4321101938.317972 ],
  [ 1341674818, 5249084620, 2262340095.8832603 ],
  [ 1341665645, 5249086654, 1789211062.113776 ],
  [ 1341636641, 5249097645, 5694164319.598579 ] ]

Position (lat, lon): [ 52.49086179333333, 13.416681503333333 ]
```

## References

- [Reverse Engineering Apple Location Services](https://appelsiini.net/2017/reverse-engineering-location-services/)
