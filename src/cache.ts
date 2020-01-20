import LRU from 'lru-cache';
import {mkdir, del, writeFile} from './file';
import filenamify from'filenamify';
import path from 'path';
import fs from 'fs';

export default class Cache {
  path: string;
  private memCache = new LRU({
    max: 500,
    maxAge: 1000 * 60 * 60 
  })

  constructor(path: string) {
    this.path = path;
  }

  async init() {
    await mkdir(this.path);
  }

  private filePrefixFromKey(key: string) {
    return path.join(this.path, filenamify(key));
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
    await new Promise((resolve, reject) => {
      inputStream.on('error', reject);
      inputStream.on('end', resolve);
    });
    
    const meta = {size};
    await writeFile(metaFilePath, JSON.stringify(meta));
    
    this.memCache.set(key, {size});
  }

  get(key: string): NodeJS.ReadableStream | null {
    const cachedItem = this.memCache.get(key);
    if (!cachedItem) return null;

    return fs.createReadStream(`${this.filePrefixFromKey(key)}.data`);
  }

  async destroy() {
    return del(this.path);
  }
}

