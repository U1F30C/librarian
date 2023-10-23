import { createWorker, Worker } from "tesseract.js";

export class OcrRef {
  worker: Worker;
  async initialize() {
    this.worker = await createWorker();
  }
  async destroy() {
    await this.worker.terminate();
  }
}

export const singletonOcrRef = new OcrRef();