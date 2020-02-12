const OSRM = require('osrm');
const fs = require('fs-extra');
const Promise = require('bluebird');

const { osrmRoute } = require('./lib/utils');

// File paths definition.
const ODPAIRS_FILE = './odpairs.json';
const OSRM_FILE = './rn/road-network.osrm';
const RESULTS_FILE = './result.json';
const ERRORS_FILE = './error.json';

async function main () {
  const started = Date.now();

  const odPairs = await fs.readJSON(ODPAIRS_FILE);
  
  const osrm = new OSRM({
    path: OSRM_FILE,
    algorithm: 'MLD'
  });
  
  const result = await Promise.map(odPairs.pairs, calcOdPairRoute(odPairs, osrm), { concurrency: 10 });
  console.log('Processed %d OD pairs', odPairs.pairs.length);

  const [valid, errors] = result.reduce((split, v) => {
    split[Number(!!v.error)].push(v);
    return split;
  }, [[], []]);

  console.log('Errors:', errors.length, ' - ', ERRORS_FILE);
  console.log('Valid:', valid.length, ' - ', RESULTS_FILE);

  await fs.writeJSON(RESULTS_FILE, valid);
  await fs.writeJSON(ERRORS_FILE, errors);

  return started;
}

let processedCount = 0;
function calcOdPairRoute (lookup, osrm) {
  return async (pair) => {
    const o = lookup.origins.features[pair.o];
    const d = lookup.destinations.features[pair.d];

    try {
      const result = await osrmRoute(osrm, {
        coordinates: [
          o.geometry.coordinates,
          d.geometry.coordinates
        ],
        overview: 'false',
        steps: true
      });

      const { distance, legs } = result.routes[0];

      const segmentIds = legs[0].steps.reduce((idsSet, leg) => {
        idsSet.add(leg.name);
        return idsSet;
      }, new Set());

      console.log('Processed %d/%d', ++processedCount, lookup.pairs.length);

      return {
        ...pair,
        coordinates: [
          o.geometry.coordinates,
          d.geometry.coordinates
        ],
        distance,
        routeSegments: Array.from(segmentIds)
      };
    } catch (error) {
      console.log('Processed %d/%d', ++processedCount, lookup.pairs.length);
      return {
        ...pair,
        coordinates: [
          o.geometry.coordinates,
          d.geometry.coordinates
        ],
        error: error.message
      };
    }
  };
}

main()
  .then((startTime) => console.log('Done in %d seconds!', (Date.now() - startTime) / 1000))
  .catch(err => console.log('Error:', err));
