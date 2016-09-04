const _CONFIG = require("../_config.js")
var JLib = require("jbackbone")

module.exports.JUtils = JLib.Utils
module.exports.JBackbone = JLib.create({
	url: _CONFIG.RABBITMQ_CONNECTION
})