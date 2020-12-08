const fs = require('fs-extra');
const acsv = require('async-csv');

const utils = require('../lib/indicators/utils');

/**
 *
 * Usage:
 *  $node ./indicators/segment-usage [input-dir] [output-dir]
 *
 */

// This script requires 3 parameters.
const [, , INPUT_DIR, OUTPUT_DIR] = process.argv;

if (!INPUT_DIR || !OUTPUT_DIR) {
  console.log(`This script requires two parameters to run:
  1. Input directory with files.
  2. Directory where the output files should be stored.
  
  Eg. $node ./indicators/segment-usage .tmp/segment-count .out/`);

  process.exit(1);
}

async function main() {
  const started = Date.now();

  console.log('Creating way lookup index...');
  // Create a lookup index for the road network ways.
  const rnWays = await fs.readJSON(`${INPUT_DIR}/roadnetwork-osm-ways.json`);
  const RN_WAYS_INDEX = rnWays.reduce((acc, w) => {
    acc[w.tags.id] = w.tags;
    return acc;
  }, {});

  const files = await fs.readdir(INPUT_DIR);
  const countFiles = files.filter((f) => f.endsWith('-count.json'));

  for (const file of countFiles) {
    const odName = file.replace('-count.json', '');
    console.log('Processing', odName);
    const counts = await fs.readJSON(`${INPUT_DIR}/${file}`);

    // Calculate indicator score.
    const maxVal = Math.max(...Object.values(counts));
    const indicator = Object.keys(counts).map((key) => {
      return {
        roadId: RN_WAYS_INDEX[key].roadId,
        value: counts[key],
        score: (counts[key] * 100) / maxVal,
      }
    });

    const csvOut = await acsv.stringify(indicator, { header: true });
    await fs.writeFile(`${OUTPUT_DIR}/${odName}.csv`, csvOut);

    console.log('Processing complete. Saved as', `${OUTPUT_DIR}/${odName}.csv`);
  }

  return started;
}

main()
  .then((startTime) =>
    console.log('Done in %d seconds!', (Date.now() - startTime) / 1000)
  )
  .catch((err) => console.log('Error:', err));
