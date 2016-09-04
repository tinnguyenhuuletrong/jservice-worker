var JWorkerInstance = require("../../lib/index.js").JWorkerInstance

var simpleWorker = new JWorkerInstance({
	queueName: "jtest"
})

simpleWorker.on("connect", () => {
	console.log("Connected")
})

simpleWorker.on("job", (job) => {
	console.log(job.toObject())
	job.end({
		gretting: "Hello " + job.args.name,
		workerName: "pid " + process.pid
	})
})