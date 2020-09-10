const fs = require('fs-extra');
const csv = require('csv');

async function main () {
  const csvData = await fs.readFile('./depths.csv');

  let index = {};

  csv.parse(csvData, { columns: true }, (err, res) => {
    res.forEach(r => {
      if (!index[r.flood]) index[r.flood] = {};

      if (!index[r.flood][r.roadId]) {
        index[r.flood][r.roadId] = {
          // Set all values to 0.
          5: 0,
          10: 0,
          20: 0,
          50: 0,
          75: 0,
          100: 0,
          200: 0,
          250: 0,
          500: 0,
          1000: 0
        };
      }

      index[r.flood][r.roadId][r.rp] = Number(r.mean);
    });

    console.log('Results saved to:');
    console.log('');
    Object.keys(index).forEach(k => {
      fs.writeJSONSync(`./depths-${k}.json`, index[k]);
      console.log(` depths-${k}.json`);
    })
    console.log('');
  });

}

main();
