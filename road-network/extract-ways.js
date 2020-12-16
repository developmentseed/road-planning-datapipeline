'use strict';
const fs = require('fs-extra');
const path = require('path');
const Osm2Obj = require('osm2obj');
const through = require('through2');

/**
 * Extract they ways from the roadnetwork osm and store them as a JSON array.
 * This can be used by other scripts to efficiently look over the ways.
 *
 * Usage:
 *  $node ./scripts/utils/extract-ways [source-file] [destination-file]
 *
 */

// This script requires 1 parameters.
const [, , INPUT_FILE, OUTPUT_FILE] = process.argv;

if (!INPUT_FILE) {
  /* eslint-disable-next-line no-console */
  console.log(`This script requires two parameters to run:
  1. Input road network in osm format
  2. Output file in json

  Eg. $node ./scripts/utils/extract-ways base-rn.osm rn-ways.json`);

  process.exit(1);
}

// //////////////////////////////////////////////////////////
// Config Vars

const RN_FILE = path.resolve(INPUT_FILE);
const OUTPUT_WAYS = path.resolve(OUTPUT_FILE || 'roadnetwork-osm-ways.json');

const rnFile = fs.createReadStream(RN_FILE);
const waysFile = fs.createWriteStream(OUTPUT_WAYS);

let start = true;
function write(row, enc, next) {
  if (!start) {
    this.push(',\n');
  } else {
    start = false;
  }
  // row.id = row.tags.id;
  next(null, JSON.stringify(row));
}

function end(next) {
  next(null, ']\n');
}

const stream = new Osm2Obj({ types: ['way'] });
const wayExtract = through.obj(write, end);
wayExtract.push('[');

rnFile.pipe(stream).pipe(wayExtract).pipe(waysFile);
