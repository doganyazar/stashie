

export function genRandomText(len: number) {
  let res = '';
  while (res.length < len) {
    res += Math.random().toString(36).slice(2);
  }
  return res.slice(0, len);
}