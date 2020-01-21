import express from 'express';
import httpProxy from 'http-proxy';
import Cache from './cache';
import logger from './logger';

const app = express();
const port = 9001;

const proxy = httpProxy.createProxyServer({});


// const cache = {};
// const cacheMiddleware = (req, res, next) => {
//   const key = req.url;
//   if (cache[key]) {
//     res.send('from cache');
//   } else {
//     res.sendResponse = res.send;
//     res.send = (body) => {
//       cache[key] = body;
//       res.sendResponse(body);
//     };
//     next();
//   }
// };

//TODO: error handling, logging, 

const cache = new Cache('./tmp/.cache/');

cache.init();

function cacheKey(req: express.Request) {
  return req.path; // Use the whole url instead
}

app.use((req, res, next) => {
  //req.originalUrl is a combination of req.baseUrl and req.path
  logger.log('Cache MW ->', req.hostname, req.method, req.originalUrl, req.path, req.baseUrl);

  // TODO don't cache POST/DELETE/PUT
  const readStream = cache.get(cacheKey(req)); 

  if (!readStream) {
    return next();
  }

  logger.log('Sending from cache');
  readStream.pipe(res);
});

app.get('*', (req, res) => {
  proxy.web(req, res, {
    target: 'http://localhost:9002'
  });

  // Listen for the `error` event on `proxy`.
  proxy.on('error', function (err, req, res) {
    res.writeHead(500, {
      'Content-Type': 'text/plain'
    });

    res.end('Something went wrong. And we are reporting a custom error message.');
  });

  //
  // Listen for the `proxyRes` event on `proxy`.
  //
  proxy.on('proxyRes', function (proxyRes, req, res) {
    console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, null, 2));

    cache.set(cacheKey(req), proxyRes);
  });

  // //
  // // Listen for the `open` event on `proxy`.
  // //
  // proxy.on('open', function (proxySocket) {
  // // listen for messages coming FROM the target here
  //   proxySocket.on('data', hybiParseAndLogMessage);
  // });

  //
  // Listen for the `close` event on `proxy`.
  //
  proxy.on('close', function (res, socket, head) {
  // view disconnected websocket connections
    console.log('Client disconnected');
  });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
}


// setInterval(() => {
//   const used = process.memoryUsage();
//   for (const key in used) {
//     console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
//   }  
// }, 10000);

export default app;