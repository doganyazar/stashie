import Cache from '../src/cache';
import {equal, deepEqual, notEqual} from 'assert';
import {del, isFileWritable, doesFileExist, readFile} from '../src/file'; // TODO: add src folder to tsconfig path
import { Readable, PassThrough } from 'stream';
import { genRandomText } from './utils';

async function stream2String(readable: NodeJS.ReadableStream) {
  let data = '';
  for await (const chunk of readable) {
    data += chunk;
  }
  return data;
}

let cache: Cache;
const cachePath = './tmp/.cache';
const maxSize = 2.1 / 1024; //2.1 KB

async function checkItemIsCached(key: string, body: string, targetCache = cache) {
  const filePrefix = cachePath + '/' + key;
  const persistedMetaObj = JSON.parse(await readFile(`${filePrefix}.meta`));
  const persistedBody = await readFile(`${filePrefix}.data`);

  const size = body.length;
  deepEqual(persistedMetaObj, {key, size});
  equal(persistedBody, body);
  notEqual(targetCache.get(key), undefined);
  deepEqual(targetCache._getMemItem(key), {size});
  deepEqual(await stream2String(targetCache.get(key)), persistedBody);
}

async function checkItemIsNotCached(key: string) {
  const filePrefix = cachePath + '/' + key;
  equal(await doesFileExist(`${filePrefix}.meta`), false);
  equal(await doesFileExist(`${filePrefix}.data`), false);
  equal(cache.get(key), undefined);
}

describe('Cache', () => {
  beforeEach(async () => {
    del.sync(cachePath);
    cache = new Cache({
      path: cachePath,
      maxSize,
      scanFolder: true
    });
    await cache.init();
  });
  it('should create writable folder', async () => {
    equal(await isFileWritable(cachePath), true); //TODO: resolve path depending on project folder?
  });

  it('should persist meta data and value of cached item', async () => {
    const textBody = 'I see dead people!';
    const key = 'booya';
    await cache.set(key, Readable.from([textBody]));
    await checkItemIsCached(key, textBody);
  });

  it('cache should ignore if readstream fails', async () => {
    const failingStream = new PassThrough();
    const key = 'failing';
    const opPromise = cache.set(key, failingStream);
    failingStream.write('1');
    failingStream.write('2');
    failingStream.emit('error', new Error('Stream has exploded due to emotional problems'));

    await opPromise;
    const filePrefix = cachePath + '/' + key;
    equal(await doesFileExist(`${filePrefix}.meta`), false);
    equal(await doesFileExist(`${filePrefix}.data`), false);

    equal(cache.get(key), undefined);
  });

  it('Cache should dispose LRU items', async () => {
    const text1 = genRandomText(1024); // 1 KB each
    const text2 = genRandomText(1024);
    const text3 = genRandomText(1024);

    await cache.set('text1', Readable.from([text1]));
    await cache.set('text2', Readable.from([text2]));

    await checkItemIsCached('text1', text1);
    await checkItemIsCached('text2', text2);

    // text3 should cause disposal of text1 due to LRU
    await cache.set('text3', Readable.from([text3]));
    await checkItemIsCached('text3', text3);
    await checkItemIsCached('text2', text2);

    await checkItemIsNotCached('text1');
  });

  it('Cache should recover persisted items', async () => {
    const resource1 = genRandomText(1024); // 1 KB each
    const resource2 = genRandomText(1024);

    await cache.set('resource1', Readable.from([resource1]));
    await cache.set('resource2', Readable.from([resource2]));

    {
      const cacheScanFolder = new Cache({
        path: cachePath,
        maxSize,
        scanFolder: true
      });
      await cacheScanFolder.init();
  
      await checkItemIsCached('resource1', resource1, cacheScanFolder);
      await checkItemIsCached('resource2', resource2, cacheScanFolder);
      equal(cacheScanFolder.keys().length, 2);
    }

    {
      const cacheIgnoreScan = new Cache({
        path: cachePath,
        maxSize,
        scanFolder: false
      });
      await cacheIgnoreScan.init();
      equal(cacheIgnoreScan.keys().length, 0);
    }
  });

  //meta files should save custom data, i.e. http headers
  //test for scanFolder to see it ignores alone .meta files or .data files with wrong hash
  //read cache folder and regenerate mem cache
  //try with binary data. Need objectMode? 
  //cache shall not crash if folder cannot be created.

});
