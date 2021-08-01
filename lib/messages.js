
// Location ========================================

const Location = {
  read (pbf, end) {
    return pbf.readFields(Location._readField, { lat: 0, lon: 0, unknown3: 0, unknown4: 0, unknown5: 0, unknown6: 0, unknown11: 0, unknown12: 0 }, end)
  },
  _readField (tag, obj, pbf) {
    if (tag === 1) obj.lat = pbf.readVarint(true)
    else if (tag === 2) obj.lon = pbf.readVarint(true)
    else if (tag === 3) obj.unknown3 = pbf.readVarint(true)
    else if (tag === 4) obj.unknown4 = pbf.readVarint(true)
    else if (tag === 5) obj.unknown5 = pbf.readVarint(true)
    else if (tag === 6) obj.unknown6 = pbf.readVarint(true)
    else if (tag === 11) obj.unknown11 = pbf.readVarint(true)
    else if (tag === 12) obj.unknown12 = pbf.readVarint(true)
  },
  write (obj, pbf) {
    if (obj.lat != null) pbf.writeVarintField(1, obj.lat)
    if (obj.lon != null) pbf.writeVarintField(2, obj.lon)
    if (obj.unknown3 != null) pbf.writeVarintField(3, obj.unknown3)
    if (obj.unknown4 != null) pbf.writeVarintField(4, obj.unknown4)
    if (obj.unknown5 != null) pbf.writeVarintField(5, obj.unknown5)
    if (obj.unknown6 != null) pbf.writeVarintField(6, obj.unknown6)
    if (obj.unknown11 != null) pbf.writeVarintField(11, obj.unknown11)
    if (obj.unknown12 != null) pbf.writeVarintField(12, obj.unknown12)
  }
}

// Device ========================================

const Device = {
  read (pbf, end) {
    return pbf.readFields(Device._readField, { bssid: '', location: null, channel: 0 }, end)
  },
  _readField (tag, obj, pbf) {
    if (tag === 1) obj.bssid = pbf.readString()
    else if (tag === 2) obj.location = Location.read(pbf, pbf.readVarint() + pbf.pos)
    else if (tag === 21) obj.channel = pbf.readVarint()
  },
  write (obj, pbf) {
    if (obj.bssid != null) pbf.writeStringField(1, obj.bssid)
    if (obj.location != null) pbf.writeMessage(2, Location.write, obj.location)
    if (obj.channel != null) pbf.writeVarintField(21, obj.channel)
  }
}

// Request ========================================

const Request = {
  read (pbf, end) {
    return pbf.readFields(Request._readField, { devices: [], unknown: 0, results: 0 }, end)
  },
  _readField (tag, obj, pbf) {
    if (tag === 2) obj.devices.push(Device.read(pbf, pbf.readVarint() + pbf.pos))
    else if (tag === 3) obj.unknown = pbf.readVarint()
    else if (tag === 4) obj.results = pbf.readVarint()
  },
  write (obj, pbf) {
    if (obj.devices != null) for (let i = 0; i < obj.devices.length; i++) pbf.writeMessage(2, Device.write, obj.devices[i])
    if (obj.unknown != null) pbf.writeVarintField(3, obj.unknown)
    if (obj.results != null) pbf.writeVarintField(4, obj.results)
  }
}

// Response ========================================

const Response = {
  read (pbf, end) {
    return pbf.readFields(Response._readField, { devices: [] }, end)
  },
  _readField (tag, obj, pbf) {
    if (tag === 2) obj.devices.push(Device.read(pbf, pbf.readVarint() + pbf.pos))
  },
  write (obj, pbf) {
    if (obj.devices) for (let i = 0; i < obj.devices.length; i++) pbf.writeMessage(2, Device.write, obj.devices[i])
  }
}

export {
  Location,
  Device,
  Request,
  Response
}
