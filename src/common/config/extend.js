const model = require('think-model');
const cache = require('think-cache');
const view = require('think-view');
module.exports = [
    model(think.app),
    cache,
    view
];
