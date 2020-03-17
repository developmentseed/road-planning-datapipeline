const fs = require('fs-extra')
const acsv = require('async-csv')
const csv = require('csv')
const util = require('util')
const stream = require('stream')

const { round } = require('../utils')
const pipeline = util.promisify(stream.pipeline)

/**
 *
 * Usage:
 *  $node ./indicators/flood-hazard [input-dir] [output-dir] [flood-type]
 *
 */

// This script requires 3 parameters.
const [, , INPUT_DIR, OUTPUT_DIR, FLOOD_TYPE] = process.argv

if (!INPUT_DIR || !OUTPUT_DIR || !FLOOD_TYPE) {
  console.log(`This script requires three parameters to run:
  1. Directory where the source files are.
  2. Directory where the output files should be stored.
  3. The flood type to be processed
  
  Eg. $node ./indicators/flood-hazard .tmp/ .out/ FD`);

  process.exit(1);
}

/**
 * Calculate expected maximum flood depth for a road segment using the
 * trapezoidal rule. Depth associated to each event and its probability of
 * occurrence as the inverse of the return period.
 *
 * @param  {array} depths     Array with depth objects per return period
 *                            [{ roadId: 'RA020220-969', rp: '1000', max: '4.245879173278809' }]
 *
 * @return {number}
 */
function calculateDepths (depths) {
  // TMP Hardcoded, should be passed as an argument of the script
  const rp = [ 5, 10, 20, 50, 75, 100, 200, 250, 500, 1000 ]

  // Order the max depths by return period, and fill non-existent ones with 0
  // Returns: [ 0, 0, 0, 0.12, 0.13, 0.5 ]
  const maxDepths = rp.map(r => {
    const rpDepth = depths.find(d => Number(d.rp) === r)

    if (rpDepth) return Number(rpDepth.max)
    return 0
  })

  // Apply trapezoidal rule
  const expectedDepth = maxDepths.reduce((total, currentDepth, idx) => {
    // Don't calculate for the last RP
    if (idx === maxDepths.length - 1) return total

    return total + (1 / (rp[idx] - 1 / rp[idx + 1]) * (currentDepth + maxDepths[idx + 1]))
  }, 0)

  return expectedDepth / 2
}

/**
 * Calculate flood depth per road segment, for a particular flood type.
 *
 * @usage node flood-hazard.js
 */
async function main () {
  const started = Date.now()

  const depths = await acsv.parse(fs.readFileSync(`${INPUT_DIR}/depths.csv`), { columns: true })

  await pipeline(
    fs.createReadStream(`${INPUT_DIR}/rn-props.csv`),
    csv.parse({ columns: true }),
    csv.transform(data => {
      // Only interested in investible roads
      if (!data.investible) return null

      const segmentDepths = depths.filter(d => d.roadId === data.roadId && d.flood.toLowerCase() === FLOOD_TYPE.toLowerCase())

      // Roads that are not flooded under any scenario
      if (!segmentDepths.length) return {
        roadId: data.roadId,
        value: 0
      }

      return {
        roadId: data.roadId,
        value: round(calculateDepths(segmentDepths))
      }
    }),
    csv.stringify({ header: true }),
    fs.createWriteStream(`${OUTPUT_DIR}/flood-depth-${FLOOD_TYPE.toLowerCase()}.csv`)
  )

  return started
}

main()
  .then((startTime) => console.log('Done in %d seconds!', (Date.now() - startTime) / 1000))
  .catch(err => console.log('Error:', err))
