function osrmRoute (osrm, opts) {
  return new Promise((resolve, reject) => {
    osrm.route(opts, (err, res) => (err ? reject(err) : resolve(res)));
  });
}

module.exports = {
  osrmRoute
};
