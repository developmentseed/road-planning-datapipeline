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
 * @returns {String}
 */
function composeId (props, idx) {
  // If no Route Number, fall back to 'R'
  return `${props.CODE || 'R'}-${idx}`
}

// Map the RAI code to attributes
const raiCodes = {
  seasonality: {
    A: 'all-weather',
    B: 'all-weather',
    C: 'dry-weather',
    D: 'not-passable'
  },
  width: {
    S: 'large',
    C: 'medium',
    T: 'small',
    U: 'unknown'
  },
  surface: {
    A: 'asphalt',
    S: 'stabilized-soil',
    T: 'earth'
  }
}

/**
 * Parses the three letter RAI code and returns the road properties. First
 * position is seasonality, second is width, and third is surface type.
 *
 * @param {string} code The RAI_2015 code, a three-letter string
 * @example
 *   // returns { surface: 'earth', seasonality: 'all-weather', width: 'small' }
 *   parseRaiCode('ATT')
 *
 * @returns {Object} An object with surface, seasonality and width of the road
 */
function parseRaiCode (code) {
  // Ensure uppercase, just in case
  // Cast undefined & nulls to 'RNV', which is Route Non Visitee in the dataset
  code = code ? code.toUpperCase() : 'RNV'

  return {
    seasonality: raiCodes['seasonality'][code[0]] || null,
    width: raiCodes['width'][code[1]] || null,
    surface: raiCodes['surface'][code[2]] || null
  }
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
        length: Math.floor(length(ft) * 1000),
        investible: checkInvestible(ft.properties.TYPE),
        ...parseRaiCode(ft.properties.RAI_2015)
      }
    }
  )))
  .pipe(geojsonStream.stringify())
  .pipe(out);