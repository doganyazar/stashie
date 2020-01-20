import mkdir from 'make-dir';
import del from 'del';
import fs from 'fs'; // TODO: use promisified

export function isFileWritable(path: string) {
  return new Promise(resolve => {
    fs.access(path, fs.constants.W_OK, (err) => resolve(!err));
  });
}

export function doesFileExist(path: string) {
  return new Promise(resolve => {
    fs.access(path, fs.constants.F_OK, (err) => resolve(!err));
  });
}

export function readFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, data) => {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}

export function writeFile(path: string, text: string) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, text, (err) => {
      if (err) return reject(err);
      return resolve();
    });
  });
}

export {mkdir, del};