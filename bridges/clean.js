const fs = require('fs-extra')
const csv = require('csv')
const util = require('util')
const stream = require('stream')

const pipeline = util.promisify(stream.pipeline)

/**
 *
 * Usage:
 *  $node ./bridges/clean [input-dir] [output-dir]
 *
 */

// This script requires 2 parameters.
const [, , INPUT_DIR, OUTPUT_DIR] = process.argv

if (!INPUT_DIR || !OUTPUT_DIR) {
  console.log(`This script requires two parameters to run:
  1. Directory where the source files are.
  2. Directory where the output files should be stored.
  
  Eg. $node ./bridges/clean .tmp/ .out/`);

  process.exit(1);
}

/**
 * Clean bridge information
 *
 * @usage node clean.js
 */
async function main () {
  const started = Date.now()
  // const depths = await acsv.parse(fs.readFileSync(`${INPUT_DIR}/depths.csv`), { columns: true })

  await pipeline(
    fs.createReadStream(`${INPUT_DIR}/bridges.csv`),
    csv.parse({ columns: true }),
    csv.transform(bridge => {
      // Skip:
      // - bridges that have no lat/lon
      // - culverts (dalot). These have structures called 'cadre' or 'picf'
      // - buse. A drainage pipe, smaller than culvert
      const bs = bridge.Structure.toLowerCase()
      if (bridge['GPS Latitude'] === ''
        || bs.includes('cadre')
        || bs.includes('picf')
        || bs.includes('buse')) return null

      // Catch simple errors in data collection of coordinates
      // Coordinates in Haiti should be around lat 18, lon -72,
      // but signs are sometimes reversed.
      const lon = bridge['GPS Longitude'] > 0
        ? bridge['GPS Longitude'] * -1
        : bridge['GPS Longitude']

      const lat = bridge['GPS Latitude'] < 0
        ? bridge['GPS Latitude'] * -1
        : bridge['GPS Latitude']

      return {
        name: bridge.Pont,
        route: bridge['Voie portée'],
        ig: bridge.IG,
        igg: bridge.IGG,
        lat: lat,
        lon: lon,
        length: bridge['Ouverture (m)'],
        structure: bridge.Structure,
        material: bridge.Materiau
      }
    }),
    csv.stringify({ header: true }),
    fs.createWriteStream(`${INPUT_DIR}/bridges-cleaned.csv`)
  )
  return started
}

main()
  .then((startTime) => console.log('Done in %d seconds!', (Date.now() - startTime) / 1000))
  .catch(err => console.log('Error:', err))
