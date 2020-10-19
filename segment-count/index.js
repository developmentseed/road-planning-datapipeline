const OSRM = require('osrm');
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
const cliProgress = require('cli-progress');
const { count } = require('console');

function osrmRoute(osrm, opts) {
  return new Promise((resolve, reject) => {
    osrm.route(opts, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

// File paths definition.
const ODPAIRS_DIR = './od-pairs';
const OSRM_FILE = './rn/road-network.osrm';
const OSM_WAYS_FILE = './roadnetwork-osm-ways.json';
const RESULTS_DIR = './results';

async function main() {
  const started = Date.now();

  await fs.ensureDir(RESULTS_DIR);

  const files = await fs.readdir(ODPAIRS_DIR);
  const odPairsFiles = files.filter((f) => f.endsWith('.json'));

  const osrm = new OSRM({
    path: OSRM_FILE,
    algorithm: 'MLD',
  });

  for (const file of odPairsFiles) {
    await processOdPairFile(file, osrm);
  }

  return started;
}

async function processOdPairFile(file, osrm) {
  const odName = file.replace('.json', '');
  console.log('Processing', odName);
  // Create progress bar.
  const progressBar = new cliProgress.SingleBar(
    {
      format: 'routing {bar} {percentage}% | {value}/{total}',
    },
    cliProgress.Presets.shades_classic
  );

  const odPairs = await fs.readJSON(path.join(__dirname, 'od-pairs', file));
  // Start with the number of pairs to process.
  progressBar.start(odPairs.pairs.length, 0);

  const result = await Promise.map(
    odPairs.pairs,
    calcOdPairRoute(odPairs, osrm, progressBar),
    { concurrency: 10 }
  );

  progressBar.stop();

  const [valid, errors] = result.reduce(
    (split, v) => {
      split[Number(!!v.error)].push(v);
      return split;
    },
    [[], []]
  );

  const counts = valid.reduce((group, o) => {
    o.routeSegments.forEach((id) => {
      group[id] = (group[id] || 0) + 1;
    });
    return group;
  }, {});

  const errorFile = path.join(RESULTS_DIR, `${odName}-errors.json`);
  console.log('Errors:', errors.length, ' - ', errorFile);
  await fs.writeJSON(path.join(__dirname, errorFile), errors);

  const resultsFile = path.join(RESULTS_DIR, `${odName}-count.json`);
  console.log('Results:', resultsFile);
  await fs.writeJSON(path.join(__dirname, resultsFile), counts);

  console.log();
}

function calcOdPairRoute(lookup, osrm, progressBar) {
  return async (pair) => {
    const o = lookup.origins.features[pair.o];
    const d = lookup.destinations.features[pair.d];

    try {
      const result = await osrmRoute(osrm, {
        coordinates: [o.geometry.coordinates, d.geometry.coordinates],
        overview: 'false',
        steps: true,
      });

      const { legs } = result.routes[0];

      const segmentIds = legs[0].steps.reduce((idsSet, leg) => {
        idsSet.add(leg.name);
        return idsSet;
      }, new Set());

      progressBar.increment();

      return {
        ...pair,
        coordinates: [o.geometry.coordinates, d.geometry.coordinates],
        routeSegments: Array.from(segmentIds),
      };
    } catch (error) {
      progressBar.increment();
      return {
        ...pair,
        coordinates: [o.geometry.coordinates, d.geometry.coordinates],
        error: error.message,
      };
    }
  };
}

main()
  .then((startTime) =>
    console.log('Done in %d seconds!', (Date.now() - startTime) / 1000)
  )
  .catch((err) => console.log('Error:', err));
