import express from 'express';

import httpProxy from 'http-proxy';

const app = express();
const port = 9001;

const proxy = httpProxy.createProxyServer({});

app.get('*', (req, res) => {
  proxy.web(req, res, {
    target: 'http://localhost:9002'
  });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Example app listening on port ${port}!`));
}


setInterval(() => {
  const used = process.memoryUsage();
  for (const key in used) {
    console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }  
}, 10000);

export default app;