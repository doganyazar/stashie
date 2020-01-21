import LRU from 'lru-cache';
import {mkdir, del, writeFile} from './file';
import filenamify from'filenamify';
import path from 'path';
import fs from 'fs';
import stream from 'stream';

export interface CacheOpts {
  path: string;
  maxSize: number; // in MB 
}

interface CacheItem {
  size: number;
}

export default class Cache {
  private opts: CacheOpts
  private memCache: LRU<string, CacheItem>;

  constructor(opts: CacheOpts) {
    this.opts = opts;
    this.itemDropped = this.itemDropped.bind(this);

    this.memCache = new LRU({
      max: opts.maxSize * 1024 * 1024,
      maxAge: 1000 * 60 * 60, 
      length: (item) => item.size,
      dispose: (key) => this.itemDropped(key)
    });
  }

  async init() {
    await mkdir(this.opts.path);
  }

  private async deletePersistedItem(key: string) {
    const filePrefix = this.filePrefixFromKey(key);
    await del([`${filePrefix}.meta`, `${filePrefix}.data`]);
  }

  private itemDropped(key: string) {
    console.log('Item dropped', key);
    return this.deletePersistedItem(key);
  }

  private filePrefixFromKey(key: string) {
    return path.join(this.opts.path, filenamify(key));
  }

  private waitForStreamEnd(streamObject: NodeJS.ReadableStream | NodeJS.WritableStream) {
    return new Promise((resolve, reject) => {
      const cleanup = stream.finished(streamObject, (err) => {
        cleanup();
        if (err) return reject(err);
        resolve();
      });
    });
  }

  async set(key: string, inputStream: NodeJS.ReadableStream, size = 0) {
    const filePrefix = this.filePrefixFromKey(key);
    const detectSize = !size;
        
    const metaFilePath = `${filePrefix}.meta`;
    const dataFilePath = `${filePrefix}.data`;
    const outputStream = fs.createWriteStream(dataFilePath);
    
    inputStream.pipe(outputStream);
    inputStream.on('data', (chunk) => {
      if (detectSize) {
        size += chunk.length;
      }
    });

    //The 'finish' event is emitted after the stream.end() method has been called, and all data has been flushed to the underlying system.
    outputStream.on('close', () => console.log('OS Closed'));
    outputStream.on('unpipe', () => console.log('OS unpiped'));

    //The stream is not closed when the 'error' event is emitted unless the autoDestroy option was set to true when creating the stream.
    // After 'error', no further events other than 'close' should be emitted (including 'error' events).
    outputStream.on('error', (err) => console.log('OS error', err));

    //The 'end' event is emitted when there is no more data to be consumed from the stream.
    // The 'end' event will not be emitted unless the data is completely consumed

    // One important caveat is that if the Readable stream emits an error during processing, the Writable destination is not closed automatically. 
    // If an error occurs, it will be necessary to manually close each stream in order to prevent memory leaks.
    console.log('Wait for input stream end');
    // await new Promise((resolve, reject) => {
    //   inputStream.on('error', reject);
    //   inputStream.on('end', resolve);
    // });
    let streamFailed = false;

    await this.waitForStreamEnd(inputStream).catch(err => {
      streamFailed = true;
      console.error('Stream failed', err.message || err.stack);
      outputStream.end();
    });

    if (streamFailed) {
      await del(dataFilePath);
    }
    
    if (!streamFailed) {
      console.log('input stream successfully ended');
      const item: CacheItem = {size};
      await writeFile(metaFilePath, JSON.stringify(item));
      await this.memCache.set(key, item);
    }
  }

  get(key: string): NodeJS.ReadableStream | undefined {
    const cachedItem = this.memCache.get(key);
    if (!cachedItem) return;
    return fs.createReadStream(`${this.filePrefixFromKey(key)}.data`);
  }

  async destroy() {
    return del(this.opts.path);
  }
}

