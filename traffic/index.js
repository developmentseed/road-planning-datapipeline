const fs = require('fs-extra');
const csv = require('csv');

/**
 * See README.md for more.
 * 
 * This script creates an index with the total AADT per ODpair.
 * Required files:
 * - aadt-per-way.csv
 * - od-pair-segments.json
 * 
 * Output:
 * - odpairs-aadt-index.json
 */

async function main () {
  const [csvData, odPairs] = await Promise.all([
    fs.readFile('./aadt-per-way.csv'),
    // The od-pair-segments is an array ordered in the same way as the pairs key
    // in the ODpairs file.
    fs.readJSON('./od-pair-segments.json')
  ]);

  const aadtIndex = await new Promise(resolve => {
    let index = {}
    csv.parse(csvData, { columns: true }, (err, res) => {
      res.forEach(r => { index[r.mbId] = Number(r.AADT); });
      resolve(index);
    });
  });

  // Create an index by a key made of origin ID and destination ID.
  // The count of odpairs in od-pair-segments.json does not match the original
  // od pairs because some were not routable and therefore did not make the file.
  let odPairAADTIndex = {};
  let erroredSegments = {};
  odPairs.forEach((o, idx) => {
    const minValue = o.routeSegments.reduce((acc, segment) => {
      const aadtVal = aadtIndex[segment];
      if (aadtVal === undefined && !erroredSegments[segment]) {
        erroredSegments[segment] = true;
        console.log(`AADT value missing for segment ${segment} - Assuming 30`);
      }
      return Math.min(aadtVal || 30, acc);
    }, Infinity);

    // Minimum aadt of the ODpair.
    // https://github.com/developmentseed/road-planning/issues/51
    odPairAADTIndex[`o${o.o}-d${o.d}`] = minValue;
  });

  const result = {
    ways: aadtIndex,
    pairs: odPairAADTIndex
  }

  await fs.writeJSON('aadt-index.json', result);

  console.log('Result saved to:');
  console.log('');
  console.log('  aadt-index.json');
  console.log('');
}

main();
