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

/**
 * Checks if a road segment can be invested in.
 * Roads with classification RU or underfined are not investible.
 *
 * @param {string} TYPE The route type
 */
function checkInvestible(type) {
  return (type && type !== 'RU')
}

fs
  .createReadStream(process.argv[2])
  .pipe(geojsonStream.parse((ft, idx) => (
    // mbId is used by Tippecanoe to set the ID on the root of the feature
    // It will be stripped from the props in the VT
    {
      ...ft,
      properties: {
        id: idx,
        mbId: idx,
        roadId: composeId(ft.properties, idx),
        route: ft.properties.CODE,
        type: ft.properties.TYPE,
        condition: ft.properties.RAI_2015,
        length: Math.floor(length(ft) * 1000),
        investible: checkInvestible(ft.properties.TYPE)
      }
    }
  )))
  .pipe(geojsonStream.stringify())
  .pipe(out);