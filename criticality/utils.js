const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Creates or updates a speed profile file with all the node pairs of the given
 * ways set to speed.
 *
 * @param  {String} speedProfileFile Path to speed profile.
 * @param  {Array} nodesGroups       Nodes to write profile for.
 *                 In format [
 *                  { nodes: [waynode, waynode], speed: 10 },
 *                  { nodes: [waynode, waynode, waynode], speed: 10 }
 *                 ]
 * @param  {boolean} append          Whether the data is going to be appended
 *                                   to the file. Used to ensure that a line
 *                                   break is added to the file.
 *
 * @return Promise{}                 Resolves when file was written.
 */
function createSpeedProfile(speedProfileFile, nodesGroups, append = false) {
  return new Promise((resolve, reject) => {
    const opts = append ? { flags: 'a' } : {};
    const file = fs.createWriteStream(speedProfileFile, opts);

    // Safety check. Ensure it's an array.
    nodesGroups = Array.isArray(nodesGroups) ? nodesGroups : [nodesGroups];

    // Check if the file is empty.
    // If it is we don't need to add a new line at the beginning.
    const onOpen = async () => {
      // The check is only needed if we're appending data.
      if (append) {
        try {
          const stats = await fs.fstat(file.fd);
          append = !!stats.size;
        } catch (error) {
          return reject(error);
        }
      }
      processWays();
    };

    // The stream cannot process data as fast as the for loop prepares it
    // so as soon as the buffer fills up the stream starts to write into
    // userspace memory. We need to check when file.write() returns false,
    // and listen for the 'drain' event on the stream before continuing to
    // write again in order to prevent all the process's memory from
    // being used up. https://nodejs.org/api/stream.html#stream_event_drain
    const processWays = (startIdx = 0) => {
      // Compute traffic profile.
      // https://github.com/Project-OSRM/osrm-backend/wiki/Traffic
      for (let ngi = startIdx; ngi < nodesGroups.length; ngi++) {
        const { nodes: wayNodes, speed: newSpeed } = nodesGroups[ngi];

        // A way must have at least 2 nodes.
        if (wayNodes.length < 2) continue;

        let contents = '';

        if (ngi !== 0 || append) {
          contents += '\n';
        }
        for (let i = 0; i < wayNodes.length - 1; i++) {
          // Add line break unless it's first iteration.
          if (i !== 0) {
            contents += '\n';
          }

          const node = Math.abs(wayNodes[i]);
          const nextNode = Math.abs(wayNodes[i + 1]);
          const rate = newSpeed * 1000;

          contents += `${node},${nextNode},${newSpeed},${rate}\n`;
          contents += `${nextNode},${node},${newSpeed},${rate}`;
        }

        if (!file.write(contents)) {
          file.once('drain', processWays.bind(null, ngi + 1));
          return;
        }
      }
      file.end();
    };

    file
      .on('open', () => onOpen())
      .on('error', (err) => reject(err))
      .on('finish', () => resolve());
  });
}

/**
 * Run an external command
 *
 * @param  {String} cmd     Command to run
 * @param  {Array} args     Args for the command
 * @param  {Object} env     Env variables
 * @param  {String} logFile Path to the log file to use
 *
 * @return Promise{}        Resolves when command finishes running.
 */
function runCmd(cmd, args, env = {}, logFile) {
  return new Promise((resolve, reject) => {
    const logFileStream = fs.createWriteStream(logFile, { flags: 'a' });
    const proc = spawn(cmd, args, { env: Object.assign({}, process.env, env) });
    let error;

    proc.stdout.on('data', (data) => {
      /* eslint-disable-next-line no-console */
      // console.log(data.toString());
      logFileStream.write(data.toString());
    });

    proc.stderr.on('data', (data) => {
      /* eslint-disable-next-line no-console */
      // console.log(data.toString());
      error = data.toString();
    });

    proc.on('close', (code) => {
      logFileStream.end();
      if (code === 0) {
        return resolve();
      } else {
        return reject(new Error(error || 'Unknown error. Code: ' + code));
      }
    });
  });
}

async function osrmApplySpeed(osrmFile, speedFile, logFile) {
  const osrmCustomizeBin = path.join(
    path.dirname(require.resolve('osrm')),
    'binding/osrm-customize'
  );
  return runCmd(
    osrmCustomizeBin,
    ['--segment-speed-file', speedFile, osrmFile],
    {},
    logFile
  );
}

module.exports = {
  createSpeedProfile,
  osrmApplySpeed
};
