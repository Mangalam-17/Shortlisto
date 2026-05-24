class LocalQueue {
    constructor(name, processor, concurrency = 5) {
        this.name = name;
        this.processor = processor;
        this.concurrency = concurrency;
        this.queue = [];
        this.active = 0;
        this.closed = false;
    }
    async _drain() {
        if (this.closed) return;
        while (this.active < this.concurrency && this.queue.length > 0) {
            const job = this.queue.shift();
            this.active += 1;
            Promise.resolve()
                .then(() => this.processor(job))
                .catch((e) => console.error(`Job failed [${this.name}]`, e))
                .finally(() => {
                    this.active -= 1;
                    setImmediate(() => this._drain());
                });
        }
    }
    async add(jobName, data, opts) {
        const job = { id: 'local-' + Date.now() + Math.random().toString(16).slice(2), name: jobName, data };
        this.queue.push(job);
        setImmediate(() => this._drain());
        return { id: job.id };
    }
    async addBulk(jobs) {
        const results = [];
        for (const j of jobs) {
            results.push(await this.add(j.name, j.data, j.opts));
        }
        return results;
    }
    async close() {
        this.closed = true;
    }
}

class QueueManager {
    constructor() {
        this.processors = {};
        this.queues = {};
        this.workers = {};
    }
    createQueue(name) {
        if (this.queues[name]) return this.queues[name];
        const self = this;
        const queue = {
            name,
            add: async (jobName, data, opts) => self.addJob(name, jobName, data, opts),
            addBulk: async (jobs) => {
                const res = [];
                for (const j of jobs) res.push(await self.addJob(name, j.name, j.data, j.opts));
                return res;
            }
        };
        this.queues[name] = queue;
        return queue;
    }
    createWorker(name, processor, options = {}) {
        this.processors[name] = new LocalQueue(name, async (job) => processor(job), options.concurrency || 5);
        this.workers[name] = this.processors[name];
        return this.workers[name];
    }
    async addJob(queueName, jobName, data, options = {}) {
        const worker = this.processors[queueName];
        if (!worker) throw new Error(`No processor registered for queue ${queueName}`);
        return await worker.add(jobName, data, options);
    }
}

const queueManager = new QueueManager();
module.exports = queueManager;
