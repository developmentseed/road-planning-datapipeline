const fs = require('fs-extra')
const acsv = require('async-csv')

const utils = require('../lib/indicators/utils')

/**
 *
 * Usage:
 *  $node ./indicators/aadt [input-dir] [output-dir]
 *
 */

// This script requires 3 parameters.
const [, , INPUT_FILE, OUTPUT_DIR] = process.argv

if (!INPUT_FILE || !OUTPUT_DIR) {
  console.log(`This script requires two parameters to run:
  1. Input file.
  2. Directory where the output files should be stored.
  
  Eg. $node ./indicators/aadt .tmp/aadt.csv .out/`);

  process.exit(1);
}

/**
 * Get AADT per road segment and calculate score.
 *
 * @usage node aadt.js
 */
async function main () {
  const started = Date.now()

  const roads = await acsv.parse(fs.readFileSync(INPUT_FILE), { columns: true })

  const iRoads = roads.filter(r => r.investible === 'True')

  const roadsWithScore = utils.addScaledScore(
    iRoads.map(r => ({ roadId: r.roadId, value: Number(r.AADT)})),
    { log: true }
  )

  const csvOut = await acsv.stringify(roadsWithScore, { header: true })
  fs.writeFileSync(`${OUTPUT_DIR}/aadt.csv`, csvOut)

  return started
}

main()
  .then((startTime) => console.log('Done in %d seconds!', (Date.now() - startTime) / 1000))
  .catch(err => console.log('Error:', err))
