const fs = require('fs-extra');
const csv = require('csv');

// This script requires 2 parameters.
const [, , INPUT_DIR, OUTPUT_DIR] = process.argv

if (!INPUT_DIR || !OUTPUT_DIR) {
  console.log(`This script requires two parameters to run:
  1. Directory where the source files are.
  2. Directory where the output files should be stored.
  
  Eg. $node ./floods/depth2index .tmp/ .out/`);

  process.exit(1);
}

async function main () {
  const csvData = await fs.readFile(`${OUTPUT_DIR}/depths.csv`);

  let index = {};

  csv.parse(csvData, { columns: true }, (err, res) => {
    res.forEach(r => {
      if (!index[r.flood]) index[r.flood] = {};

      if (!index[r.flood][r.roadId]) {
        index[r.flood][r.roadId] = {
          // Set all values to 0.
          5: { meanDepth: 0, percFlooded: 0 },
          10: { meanDepth: 0, percFlooded: 0 },
          20: { meanDepth: 0, percFlooded: 0 },
          50: { meanDepth: 0, percFlooded: 0 },
          75: { meanDepth: 0, percFlooded: 0 },
          100: { meanDepth: 0, percFlooded: 0 },
          200: { meanDepth: 0, percFlooded: 0 },
          250: { meanDepth: 0, percFlooded: 0 },
          500: { meanDepth: 0, percFlooded: 0 },
          1000: { meanDepth: 0, percFlooded: 0 }
        };
      }

      index[r.flood][r.roadId][r.rp] = {
        meanDepth: Number(r.mean),
        percFlooded: Number(r.count) / (Number(r.nodata) + Number(r.count))
      };
    });

    console.log(`Results saved to: ${OUTPUT_DIR}`);
    console.log('');
    Object.keys(index).forEach(k => {
      fs.writeJSONSync(`${OUTPUT_DIR}/depth-index-${k}.json`, index[k]);
      console.log(` depths-index-${k}.json`);
    })
    console.log('');
  });

}

main();
