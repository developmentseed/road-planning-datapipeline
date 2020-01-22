const fs = require('fs-extra')
const geojsonStream = require('geojson-stream')
const length = require('@turf/length').default

/**
 * Clean road network data from the RoutesRAI_2015 dataset in Haiti and prepare
 * it for use in the Haiti Road Planning tool.
 *
 * @usage node rn-clean.js <input.geojson> <output>
 */

const out = fs.createWriteStream(process.argv[3]);

/**
 * Composes a human readable and unique ID for the road segment. It uses the
 * route number (RD103) and the index of the feature in the GeoJSON.
 * Eg. RD103-1450
 * 
 * @param {object} props Properties of the feature
 * @param {number} idx The index of the feature
 *
 * @returns String
 */
function composeId (props, idx) {
  // If no Route Number, fall back to 'R'
  return `${props.CODE || 'R'}-${idx}`
}

fs
  .createReadStream(process.argv[2])
  .pipe(geojsonStream.parse((ft, idx) => {
    return {
      ...ft,
      properties: {
        id: idx,
        roadId: composeId(ft.properties, idx),
        route: ft.properties.CODE,
        type: ft.properties.TYPE,
        condition: ft.properties.RAI_2015,
        length: Math.floor(length(ft) * 1000)
      }
    }
  }))
  // .pipe(new Transform({ objectMode: true, transform: transform }))
  .pipe(geojsonStream.stringify())
  .pipe(out);