import Cache from '../src/cache';
import {equal, deepEqual, } from 'assert';
import {del, isFileWritable, doesFileExist, readFile} from '../src/file'; // TODO: add src folder to tsconfig path
import { Readable, PassThrough } from 'stream';

async function stream2String(readable: NodeJS.ReadableStream) {
  let data = '';
  for await (const chunk of readable) {
    data += chunk;
  }
  return data;
}

let cache: Cache;
const cachePath = './tmp/.cache';

describe('Cache', () => {
  beforeEach(async () => {
    del.sync(cachePath);
    cache = new Cache(cachePath);
    await cache.init();
  });
  it('should create writable folder', async () => {
    equal(await isFileWritable(cachePath), true); //TODO: resolve path depending on project folder?
  });

  it('should persist meta data and value of cached item', async () => {
    const textBody = 'I see dead people!';
    const key = 'booya';
    const size = textBody.length;
    await cache.set(key, Readable.from([textBody]));
    const filePrefix = cachePath + '/' + key;
    const persistedMetaObj = JSON.parse(await readFile(`${filePrefix}.meta`));
    const persistedBody = await readFile(`${filePrefix}.data`);

    deepEqual(persistedMetaObj, {size});
    equal(persistedBody, textBody);
    deepEqual(await stream2String(cache.get(key)), persistedBody);
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

  //read cache folder and regenerate mem cache
  //try with binary data. Need objectMode? 

});
