var EventEmitter = require('events').EventEmitter;
var util = require('util');

const _Common = require("./_common.js")
const JUtils = _Common.JUtils
const JBackbone = _Common.JBackbone
const NullCallback = () => {}

var WorkerInstance = function(options) {
	this.queueName = options.queueName
	this.fetchCount = options.prefetch || 10
	this.outPublish = options.outPublish || "frontapi.out"
	this.workerSock = null

	var ins = this

	if (this.queueName == null)
		throw new Error("Missing options.queueName")

	JBackbone.createSock("WORKER", {
		prefetch: this.fetchCount
	}).then(worker => {
		this.workerSock = worker
		worker.setEncoding('utf8');
		worker.connect(this.queueName, () => {

			// emit event
			this.emit("connect", worker)

			worker.on('data', (msg) => {
				//Wrapper new job
				try {
					let job = new WorkerRequest(msg, () => {
						worker.ack()
					}, {
						ins: ins
					})

					this.emit("job", job)
				} catch (ex) {
					console.error(ex)
				}
			})
		})
	})

}
util.inherits(WorkerInstance, EventEmitter);
module.exports.WorkerInstance = WorkerInstance

WorkerInstance.prototype.publishMessage = function(options, callback) {
	callback = callback || NullCallback
	var data = options.data
	var topic = options.topic || this.outPublish

	if (data == null)
		return callback(400, "Require options.data")

	//	Safeguard type converter
	if (typeof data === 'string' || data instanceof String) {} else {
		data = JSON.stringify(data)
	}

	//Publish to channel
	JBackbone.cacheSocket({
		type: "PUB",
		topic: topic
	}).then(pub => {
		pub.write(data)
		callback(null)
	}).catch(err => {
		callback(err)
	})
};


//---------------------------------------------------------------------------------------------//
//										Worker Request Object
//---------------------------------------------------------------------------------------------//
var WorkerRequest = function(msg, finishCallback, options) {
	//	msg following format
	//	http://www.jsoneditoronline.org/?id=e6962e9a1c82b3ec92ba98b38b9e47d4

	msg = JUtils.ParseJsonString(msg)

	if (msg == null || msg.wids == null || msg.header == null || msg.payload == null)
		throw new Error("Message invalid json format")

	//Mandatory Parts
	this.header = msg.header
	this.args = msg.payload
	this.taskID = msg.wids
	this.res = "";

	//Optional Parts. Filled Default Value
	options = options == null ? {} : options;

	this.options = options
	this.workerIns = options.ins

	this._ended = false

	this.toObject = function() {
		return msg
	}

	this.recordProfiler = function() {
		//this.pTicket = ActivityProfiler.begin(this.path, this.args);
	};

	this.endProfiler = function() {
		//if (this.pTicket != null)
		//	ActivityProfiler.end(this.pTicket);
	};

	this.write = function(data) {
		//Type safeguard converter
		if (typeof data === 'string' || data instanceof String) {} else {
			data = JSON.stringify(data)
		}

		this.res += data;
	};

	this.end = function(data) {
		this.write(data);
		this.finish();
	};

	this.finish = function() {
		if (this._ended)
			throw new Error("[WorkerRequest] finish method has already called!")

		var payload = {
			wids: this.taskID,
			res: this.res
		}

		this._ended = true
		this.workerIns.publishMessage({
			data: payload
		}, () => {
			this.done()
		})
	};

	this.done = function() {
		//Marked End profiler
		this.endProfiler();

		//Send ACK
		finishCallback();
	}
}