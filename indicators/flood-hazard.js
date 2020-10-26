const fs = require('fs-extra')
const acsv = require('async-csv')
const csv = require('csv')
const util = require('util')
const stream = require('stream')

const ead = require('../lib/roads/ead')
const roadUtils = require('../lib/roads/utils')
const hazards = require('../lib/instance/hazards')

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
 * Order an array of flood depths by return period, and fill non-existent ones
 * with 0.
 *
 * @param  {array} depths     Array with depth objects per return period
 *                            [{ roadId: 'RA020220-969', rp: '1000', max: '4.245879173278809' }]
 *
 * @return {array}
 */
function fillDepths (depths) {
  return hazards.floods.rp.map(r => {
    const rpDepth = depths.find(d => Number(d.rp) === r)

    return {
      rp: r,
      depth: rpDepth ? Number(rpDepth.max) : 0,
      percFlooded: rpDepth ? Number(rpDepth.count) / (Number(rpDepth.nodata) + Number(rpDepth.count)) : 0
    }
  })
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
    csv.transform(road => {
      // Only interested in investible roads
      if (!road.investible) return null

      const segmentDepths = depths.filter(d => d.roadId === road.roadId && d.flood.toLowerCase() === FLOOD_TYPE.toLowerCase())

      // Roads that are not flooded under any scenario
      if (!segmentDepths.length) return {
        roadId: road.roadId,
        value: 0
      }

      const allDepths = fillDepths(segmentDepths)

      // Ensure that all required road props are set
      const roadSegment = roadUtils.setDefaultAttributes(road)

      return {
        roadId: roadSegment.roadId,
        value: ead.calculateRoadEAD(roadSegment, allDepths)
      }
    }),
    csv.stringify({ header: true }),
    fs.createWriteStream(`${OUTPUT_DIR}/flood-ead-${FLOOD_TYPE.toLowerCase()}.csv`)
  )

  return started
}

main()
  .then((startTime) => console.log('Done in %d seconds!', (Date.now() - startTime) / 1000))
  .catch(err => console.log('Error:', err))
