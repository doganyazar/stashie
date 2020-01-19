import Cache from '../src/cache';
import {equal, deepEqual} from 'assert';
import {del, isFileWritable, readFile} from '../src/file'; // TODO: add src folder to tsconfig path

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
    await cache.set(key, textBody);
    const filePrefix = cachePath + '/booya';
    const persistedMetaObj = JSON.parse(await readFile(`${filePrefix}.meta`));
    const persistedBody = await readFile(`${filePrefix}.data`);

    deepEqual(persistedMetaObj, {size});
    equal(persistedBody, textBody);
    deepEqual(cache.get(key), {size});
  });

});
