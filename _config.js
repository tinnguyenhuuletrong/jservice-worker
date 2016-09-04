var commonConfig = {}
commonConfig.RABBITMQ_CONNECTION = "amqp://guest:09031988@103.53.171.99:5672"

module.exports = commonConfig

//---------------
// Override Global Function
//---------------
if (commonConfig.ConsoleLogEnable === 0)
	console.log = function() {}