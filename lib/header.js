class Header {
  constructor (options = {}) {
    this.locale = options.locale || 'en_US'
    this.identifier = options.identifier || 'com.apple.locationd'
    this.version = options.version || '0.0.0.0'
  }

  get size () {
    return 8 + 6 + Buffer.byteLength(this.locale) +
      Buffer.byteLength(this.identifier) +
      Buffer.byteLength(this.version)
  }

  /**
   * @param {Buffer} [buffer]
   * @param {number} [offset]
   */
  write (buffer, offset) {
    const localeLength = Buffer.byteLength(this.locale)
    const identifierLength = Buffer.byteLength(this.identifier)
    const versionLength = Buffer.byteLength(this.version)

    const size = 8 + 6 + localeLength + identifierLength + versionLength

    buffer = buffer || Buffer.alloc(size)
    offset = offset || 0x00

    // NUL SOH      // 0x0001 start of header
    buffer.writeUInt16BE(0x0001, offset)
    // [length]     // length of the locale string in bytes
    buffer.writeUInt16BE(localeLength, offset += 0x02)
    // [locale]     // en_US
    buffer.write(this.locale, offset += 0x02)
    // [length]     // length of the identifier string in bytes
    buffer.writeUInt16BE(identifierLength, offset += localeLength)
    // [identifier] // com.apple.locationd
    buffer.write(this.identifier, offset += 0x02)
    // [length]     // length of the version string in bytes
    buffer.writeUInt16BE(versionLength, offset += identifierLength)
    // [version]    // 8.4.1.12H321 ie. ios version and build
    buffer.write(this.version, offset += 0x02)
    // NUL NUL      // 0x0000 end of header
    buffer.writeUInt16BE(0x0000, offset += versionLength)
    // NUL SOH      // 0x0001 start of header
    buffer.writeUInt16BE(0x0001, offset += 0x02)
    // NUL NUL      // 0x0000 end of header
    buffer.writeUInt16BE(0x0000, offset += 0x02)

    return buffer
  }
}

// Exports
export default Header
