export class WorkerPool {
  constructor(count, onResult) {
    this.onResult = onResult; this.queue = []; this.nextId = 0;
    this.stats = { completed: 0, cancelledQueued: 0, cancelledRunning: 0, stale: 0, failed: 0 };
    this.slots = Array.from({ length: count }, () => this.makeSlot());
  }
  makeSlot() {
    const slot = { worker: new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }), job: null };
    slot.worker.onmessage = ({ data }) => {
      const job = slot.job; slot.job = null;
      if (job && data.id === job.id) { this.stats.completed++; this.onResult(data); }
      else this.stats.stale++;
      this.pump();
    };
    slot.worker.onerror = event => { this.stats.failed++; this.onResult({ ...slot.job, error: event.message }); slot.job = null; this.pump(); };
    return slot;
  }
  submit(job) {
    // Keep only the newest queued revision of a resident chunk.
    const previous = this.queue.length; this.queue = this.queue.filter(p => p.key !== job.key);
    this.stats.cancelledQueued += previous - this.queue.length;
    const request = { ...job, id: ++this.nextId }; this.queue.push(request); this.pump(); return request.id;
  }
  cancel(key) {
    const previous = this.queue.length; this.queue = this.queue.filter(p => p.key !== key);
    this.stats.cancelledQueued += previous - this.queue.length;
    for (let i = 0; i < this.slots.length; i++) if (this.slots[i].job?.key === key) {
      this.slots[i].worker.terminate(); this.stats.cancelledRunning++; this.slots[i] = this.makeSlot();
    }
    this.pump();
  }
  pump() { for (const slot of this.slots) if (!slot.job && this.queue.length) { slot.job = this.queue.shift(); slot.worker.postMessage(slot.job); } }
  get pending() { return this.queue.length + this.slots.filter(s => s.job).length; }
  dispose() { this.queue = []; this.slots.forEach(s => s.worker.terminate()); }
}
