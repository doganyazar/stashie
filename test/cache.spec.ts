import Cache from '../src/cache';
import {equal, deepEqual, } from 'assert';
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

async function checkItemIsCached(key: string, body: string) {
  const filePrefix = cachePath + '/' + key;
  const persistedMetaObj = JSON.parse(await readFile(`${filePrefix}.meta`));
  const persistedBody = await readFile(`${filePrefix}.data`);

  deepEqual(persistedMetaObj, {size: body.length});
  equal(persistedBody, body);
  deepEqual(await stream2String(cache.get(key)), persistedBody);
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
      maxSize
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

  //read cache folder and regenerate mem cache
  //try with binary data. Need objectMode? 

});
