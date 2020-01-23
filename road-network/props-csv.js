const fs = require('fs-extra')
const stringify = require('csv-stringify')
const geojsonStream = require('geojson-stream')

/**
 * Generate a CSV with properties of each road segment.
 *
 * @usage node props-csv.js <input.geojson> <output>
 */

const out = fs.createWriteStream(process.argv[3]);

fs
  .createReadStream(process.argv[2])
  .pipe(geojsonStream.parse((ft) => ft.properties))
  .pipe(stringify({ header: true }))
  .pipe(out);
