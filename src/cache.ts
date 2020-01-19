import LRU from 'lru-cache';
import {mkdir, del, writeFile} from './file';
import filenamify from'filenamify';
import path from 'path';

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

  async set(key: string, body: string) {
    const size = body.length;
    const meta = {size};
    const filePrefix = path.join(this.path, filenamify(key));

    console.log(`${filePrefix}.meta`);

    const metaFilePath = `${filePrefix}.meta`;
    const dataFilePath = `${filePrefix}.data`;
    await writeFile(metaFilePath, JSON.stringify(meta));
    await writeFile(dataFilePath, body);
    this.memCache.set(key, {size});
  }

  get(key: string) {
    return this.memCache.get(key);
  }

  async destroy() {
    return del(this.path);
  }
}

