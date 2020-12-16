const fs = require('fs-extra');
const path = require('path');
const nodeCleanup = require('node-cleanup');

function initLog(logfilePath) {
  fs.ensureDirSync(path.dirname(logfilePath));
  // File stream.
  const logfile = fs.createWriteStream(logfilePath);
  const clog = (...args) => {
    /* eslint-disable-next-line no-console */
    console.log(...args);
    const data = args.reduce((acc, arg) => {
      if (typeof arg === 'object') {
        arg = JSON.stringify(arg, null, '\t');
      }
      return acc + arg + ' ';
    }, '');

    logfile.write(data);
    logfile.write('\n');
  };
  // Close the stream
  nodeCleanup(function (exitCode, signal) {
    logfile.write(`Code: ${exitCode}\n`);
    logfile.end(`Signal ${signal}`);
  });

  return clog;
}

module.exports = {
  initLog
};
