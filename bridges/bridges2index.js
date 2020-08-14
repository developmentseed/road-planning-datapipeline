const fs = require('fs-extra');
const csv = require('csv');

async function main () {
  const csvData = await fs.readFile('./bridges.csv');

  let index = {};

  csv.parse(csvData, { columns: true }, (err, res) => {
    res.forEach(bridge => {
      if (!bridge.roadId) return;

      if (!index[bridge.roadId]) index[bridge.roadId] = [];
      index[bridge.roadId].push({
        ...bridge,
        igg: Number(bridge.igg),
        lat: Number(bridge.lat),
        lon: Number(bridge.lon),
        length: Number(bridge.length),
        distanceMatchingRoad: Number(bridge.distanceMatchingRoad)
      });
    });

    fs.writeJSONSync(`./bridges.json`, index);
    console.log('Results saved to:');
    console.log('');
    console.log(` bridges.json`);
    console.log('');
  });

}

main();
