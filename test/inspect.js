import util from 'util'
import os from 'os'

const options = {
  depth: null,
  colors: process.stdin.isTTY
}

function inspect (value) {
  return util.inspect(value, options)
}

inspect.print = function (value) {
  process.stdout.write(inspect(value))
  process.stdout.write(os.EOL)
}

export default inspect
