const fs = require('fs-extra')
const acsv = require('async-csv')
const csv = require('csv')
const util = require('util')
const stream = require('stream')

const pointToLineDistance = require('@turf/point-to-line-distance').default
const pipeline = util.promisify(stream.pipeline)

/**
 *
 * Usage:
 *  $node ./bridges/match [input-dir] [output-dir]
 *
 */

// This script requires 2 parameters.
const [, , INPUT_DIR, OUTPUT_DIR] = process.argv

if (!INPUT_DIR || !OUTPUT_DIR) {
  console.log(`This script requires two parameters to run:
  1. Directory where the source files are.
  2. Directory where the output files should be stored.
  
  Eg. $node ./bridges/match .tmp/ .out/`);

  process.exit(1);
}

/**
 * Check the road segment that is closest to the bridge / culvert, add the ID
 * of the road segment to the bridge feature.
 * Since bridges only have a reference to the route number (N1) and not the
 * road ID (N1-2102), this function relies on @turf/distance to look
 * the closest segment.
 *
 * @usage node match.js
 */
async function main () {
  const started = Date.now()

  const rn = await fs.readJSON(`${INPUT_DIR}/base-rn.geojson`)
  // Only match to investible road segments
  const investibleFt = rn.features.filter(segment => segment.properties.investible)

  await pipeline(
    // Read the cleaned bridge data from clean.js
    fs.createReadStream(`${INPUT_DIR}/bridges-cleaned.csv`),
    csv.parse({ columns: true }),
    csv.transform(bridge => {
      // MultiLineStrings not supported by turf
      let matchingRoadSegments = investibleFt
        .filter(segment => segment.geometry.type === 'LineString')
    
      // Calculate distance of road segments to the bridge
      const segments = matchingRoadSegments.map(road => {
        road.properties.distance = pointToLineDistance([Number(bridge.lon), Number(bridge.lat)], road)
        return road
      }).sort((a, b) => a.properties.distance - b.properties.distance)
    
      // If distance is more than 0.5km, it's likely no good match
      if (!segments.length || segments[0].properties.distance > 0.5) return {
        ...bridge,
        roadId: null,
        distanceMatchingRoad: null
      }

      return {
        ...bridge,
        roadId: segments[0].properties.roadId,
        distanceMatchingRoad: segments[0].properties.distance
      }
    }),
    csv.stringify({ header: true }),
    fs.createWriteStream(`${OUTPUT_DIR}/bridges.csv`)
  )
  return started
}

main()
  .then((startTime) => console.log('Done in %d seconds!', (Date.now() - startTime) / 1000))
  .catch(err => console.log('Error:', err))
