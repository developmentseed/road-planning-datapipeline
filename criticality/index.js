/* eslint-disable no-console */
const os = require('os');
const OSRM = require('osrm');
const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');
const cliProgress = require('cli-progress');
const acsv = require('async-csv');

const { createSpeedProfile, osrmApplySpeed } = require('./utils');
const { initLog } = require('./logging');

process.env.UV_THREADPOOL_SIZE = Math.ceil(os.cpus().length * 1.5);

// //////////////////////////////////////////////////////////
// Config Vars

const WORK_DIR = path.resolve(__dirname, 'workdir');
const SRC_DIR = path.resolve(__dirname, 'src-files');
const LOG_DIR = path.resolve(__dirname, 'workdir/log');

const OD_FILE = path.resolve(SRC_DIR, 'odpairs.geojson');
const WAYS_FILE = path.resolve(SRC_DIR, 'roadnetwork-osm-ways.json');
const OSRM_FOLDER = path.resolve(SRC_DIR, 'rn');
const OSRM_FILE_NAME = 'base-rn.osrm';
const OUTPUT_INDICATOR_FILE = path.resolve(WORK_DIR, 'criticality.csv');

// Number of concurrent operations to run.
const CONCURR_OPS = 10;

// Init a global log to capture the console log statements.
const clog = initLog(`${LOG_DIR}/log-${Date.now()}.log`);

clog('Loading file:', OD_FILE);
const odPairs = fs.readJsonSync(OD_FILE);
clog('Loading file:', WAYS_FILE);
var ways = fs.readJsonSync(WAYS_FILE);

// Ways subset:
// ways = ways.slice(0, 15);
// Ways using nodes:
// ways = [ways.find(way => way.nodes.indexOf('1405957') !== -1)]
// Specific way:
// ways = [
//   ways.find(way => way.id === '2289499')
// ];
// Only keep investible ways.
ways = ways.filter((w) => w.tags.investible === 'true');

/**
 * Run the criticality analysis.
 * Steps:
 * - Computes the time it takes for each OD pair.
 * - For each way on the RN:
 *   - Removes it runs the analysis again.
 *   - Computes the time difference for each OD pair (compare to benchmark)
 *   - Stores the cumulative "time lost" for each way. (The additional time
 *     needed when that way is removed.)
 */
async function main() {
  await fs.ensureDir(`${LOG_DIR}/ways-times`);

  const coords = odPairs.features.map((feat, idx) => {
    const { type, coordinates } = feat.geometry;
    if (type === 'MultiPoint') return coordinates[0];
    if (type === 'Point') return coordinates;
    throw new Error(
      `Invalid geometry type ${type} fount for feature index ${idx}`
    );
  });

  clog('Working with %d locations', coords.length);
  clog('Working with %d ways', ways.length);

  console.time('benchmark');
  // Run the benchmark analysis
  const benchmark = await osrmTable(`${OSRM_FOLDER}/${OSRM_FILE_NAME}`, {
    coordinates: coords
  });
  console.timeEnd('benchmark');

  // Create progress bar.
  const progressBar = new cliProgress.SingleBar(
    {
      format:
        'routing {bar} {percentage}% | {value}/{total} | Elapsed {duration_formatted} | ETA {eta_formatted}'
    },
    cliProgress.Presets.shades_classic
  );

  // Start with the number of pairs to process.
  progressBar.start(ways.length, 0);

  const wayTaskCreator = async (way) => {
    // Calculate the "time lost" for a given way.
    const data = await calcTimePenaltyForWay(way, coords, benchmark);
    // console.log('Way %d done.', way.id);
    progressBar.increment();

    return data;
  };

  const result = await Promise.map(ways, wayTaskCreator, {
    concurrency: CONCURR_OPS
  });

  progressBar.stop();

  // Calculate score (0 - 100)
  // maxtime: normalize values taking into account affected and unroutable pairs.
  // maxUnroutable: self describing.
  // Use same reduce to avoid additional loops.
  const { avgMaxTime, maxUnroutable } = result.reduce(
    (acc, o) => ({
      avgMaxTime: Math.max(
        acc.avgMaxTime,
        (o.unroutablePairs + o.impactedPairs) * o.avgTimeNonZero
      ),
      maxUnroutable: Math.max(acc.maxUnroutable, o.unroutablePairs)
    }),
    { avgMaxTime: 0, maxUnroutable: 0 }
  );

  const scoredRes = result.map((segment) => {
    const timeScore =
      ((segment.unroutablePairs + segment.impactedPairs) *
        segment.avgTimeNonZero) /
      avgMaxTime;
    const unroutableScore = segment.unroutablePairs / maxUnroutable;

    // Time is 40%, unroutable is 60%.
    // Then normalize to 0 - 100 scale.
    segment.score =
      ((timeScore || 0) * 0.4 + (unroutableScore || 0) * 0.6) * 100;

    return segment;
  });

  await fs.writeJSON(`${LOG_DIR}/criticality.json`, scoredRes);

  const indicator = scoredRes.map((o) => ({
    roadId: o.roadId,
    score: o.score,
    // There's no single value to store since the score calculation uses several
    // variables.
    value: null
  }));

  const csvOut = await acsv.stringify(indicator, { header: true });
  await fs.writeFile(OUTPUT_INDICATOR_FILE, csvOut);

  clog('Processing complete. Saved as', OUTPUT_INDICATOR_FILE);
}

Promise.resolve(Date.now()).then(async (startTime) => {
  try {
    await main();
  } catch (error) {
    /* eslint-disable-next-line no-console */
    clog('Error:', error);
  }
  /* eslint-disable-next-line no-console */
  clog('Done in %d seconds!', (Date.now() - startTime) / 1000);
});

/**
 * Computes the time between every OD using the provided osrm file.
 *
 * @param  {string} file Path to the osrm file.
 * @param  {Object} opts Options for osrm-table.
 * @param  {object} way  Way being excluded.
 * @return {Promise}     Promise resolving with array of time between every
 *                       OD pairs.
 */
function osrmTable(file, opts) {
  return new Promise((resolve, reject) => {
    var osrm = new OSRM({
      path: file,
      algorithm: 'MLD',
      mmap_memory: false
    });
    osrm.table(opts, (err, response) => {
      if (err) return reject(err);

      // Create origin destination array.
      const table = response.durations;
      const len = table.length;
      var result = [];

      // For loops, not as pretty but fast.
      for (let rn = 0; rn < len - 1; rn++) {
        for (let cn = rn + 1; cn < len; cn++) {
          // Going from A to B may yield a different value than going from
          // B to A. For some reason if the starting point is near a road that
          // is ignored (with the speed profile) it will be marked and
          // unroutable and null is returned.
          let ab = table[rn][cn];
          let ba = table[cn][rn];

          // When the closest segment to A or B is the one ignored, the route
          // should be considered unroutable. This will solve the cases
          // outlined in https://github.com/developmentseed/moz-datapipeline/issues/7#issuecomment-363153755
          if (ab === null || ba === null) {
            result.push({
              oIdx: rn,
              dIdx: cn,
              routable: false,
              time: null
            });
          } else {
            result.push({
              oIdx: rn,
              dIdx: cn,
              routable: true,
              time: Math.max(ab, ba)
            });
          }
        }
      }

      return resolve(result);
    });
  });
}

/**
 * Calculate the "time lost" for a given way. By ignoring the way from the
 * road network we know how important it is when compared with the
 * benchmark analysis.
 *
 * @param  {Object} way      Way to ignore from the RN.
 * @param  {Array} coords    OD coordinates
 * @param  {Array} benchmark Benchmark analysis of th RN.
 *
 * @return {Object}          Way analysis
 *   {
 *      wayId: OSM id
 *      name: WAY name
 *      maxTime: Max time lost of all OD Pairs
 *      unroutablePairs: Number of OD pairs that became unroutable.
 *      impactedPairs: Number of OD pairs affected
 *   }
 */
async function calcTimePenaltyForWay(way, coords, benchmark) {
  const osrmFolder = `osrm-${way.id}`;

  await fs.copy(OSRM_FOLDER, `${WORK_DIR}/${osrmFolder}`);
  const osrmFile = `${WORK_DIR}/${osrmFolder}/${OSRM_FILE_NAME}`;

  const speedProfileFile = `${WORK_DIR}/speed-${way.id}.csv`;
  const logFile = `${LOG_DIR}/log-${way.id}.log`;

  await createSpeedProfile(speedProfileFile, [
    {
      nodes: way.nodes,
      speed: 0
    }
  ]);

  await osrmApplySpeed(osrmFile, speedProfileFile, logFile);

  // Speed profile file is no longer needed.
  fs.remove(speedProfileFile);

  // console.time(`routing ${way.id}`);
  const result = await osrmTable(osrmFile, {
    coordinates: coords
  });
  // console.timeEnd(`routing ${way.id}`);

  // Will error for very big matrices because string length will be too big.
  // await fs.writeJSON(`${LOG_DIR}/ways-times/way-${way.id}-all.json`, result);

  // We don't have to wait for files to be removed.
  fs.remove(`${WORK_DIR}/${osrmFolder}`);

  // Start processing.

  // Debug vars
  let minTime = 0;
  let max = 0;

  let unroutablePairs = 0;
  let impactedPairs = 0;
  let timeDeltas = [];

  for (let i = 0; i < result.length; i++) {
    const route = result[i];

    // Stop processing if it's ot routable.
    if (!route.routable) {
      unroutablePairs++;
      continue;
    }

    // Find benchmark item. The resulting array has the exact same length.
    const bMarkItem = benchmark[i];
    var deltaT = route.time - bMarkItem.time;

    if (deltaT >= 0) timeDeltas.push(deltaT);
    if (deltaT > 0) impactedPairs++;
    if (deltaT < 0) unroutablePairs++;
    // Done. Below is all debug info.

    // Debug: Log the max time for each way.
    if (max < deltaT) {
      max = deltaT;
      const orig = odPairs.features[route.oIdx];
      const dest = odPairs.features[route.dIdx];
      const dump = {
        wayId: way.id,
        mbId: way.tags.mbId,
        roadId: way.tags.roadId,
        time: deltaT,
        debugUrl: `http://localhost:9966/?loc=${orig.geometry.coordinates[1]}%2C${orig.geometry.coordinates[0]}&loc=${dest.geometry.coordinates[1]}%2C${dest.geometry.coordinates[0]}`,
        item: route,
        benchmark: bMarkItem,
        origin: orig,
        destination: dest
      };
      await fs.writeJSON(`${LOG_DIR}/max-time-${way.id}.json`, dump);
    }

    // Debug: Negative values.
    if (deltaT < -300) {
      clog(
        'High negative time detected (%d) on way %d. Dumping to file, assuming unroutable',
        deltaT,
        way.id
      );

      // Only log the highest negative.
      if (deltaT < minTime) {
        minTime = deltaT;
        const orig = odPairs.features[route.oIdx];
        const dest = odPairs.features[route.dIdx];
        const dump = {
          wayId: way.id,
          mbId: way.tags.mbId,
          roadId: way.tags.roadId,
          negativeTime: deltaT,
          debugUrl: `http://localhost:9966/?loc=${orig.geometry.coordinates[1]}%2C${orig.geometry.coordinates[0]}&loc=${dest.geometry.coordinates[1]}%2C${dest.geometry.coordinates[0]}`,
          item: route,
          benchmark: bMarkItem,
          origin: odPairs.features[route.oIdx],
          destination: odPairs.features[route.dIdx]
        };
        await fs.writeJSON(`${LOG_DIR}/negative-time-${way.id}.json`, dump);
      }
    } else if (deltaT < 0) {
      clog(
        'Low negative time detected (%d) on way %d. Assuming unroutable',
        deltaT,
        way.id
      );
    }
  }

  const data = {
    wayId: way.id,
    mbId: way.tags.mbId,
    roadId: way.tags.roadId,
    maxTime: arrayMax(timeDeltas),
    avgTime: timeDeltas.reduce((a, b) => a + b) / timeDeltas.length,
    avgTimeNonZero: timeDeltas.reduce((a, b) => a + b) / impactedPairs,
    unroutablePairs,
    impactedPairs
  };

  await fs.writeJSON(`${LOG_DIR}/ways-times/way-${way.id}.json`, data);

  return data;
}

// Avoid Maximum call stack size exceeded with Math.max
// https://stackoverflow.com/questions/42623071/maximum-call-stack-size-exceeded-with-math-min-and-math-max
function arrayMax(arr) {
  let len = arr.length;
  let max = -Infinity;

  while (len--) {
    max = arr[len] > max ? arr[len] : max;
  }
  return max;
}
