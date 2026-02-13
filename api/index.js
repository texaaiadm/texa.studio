const requestHandler = require('../admin-server/server.cjs');

module.exports = (req, res) => {
    return requestHandler(req, res);
};

// Trigger redeploy
