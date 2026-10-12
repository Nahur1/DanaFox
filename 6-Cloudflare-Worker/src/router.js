/* tiny router shared by the user API (api.js) and the admin API (admin.js) */
import { ApiError, json } from './util.js';
const R = [];
export const route = (method, path, fn) => R.push([method, new RegExp('^' + path.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)') + '$'), fn]);
export async function handleApi(req, env, url) {
  for (const [m, re, fn] of R) {
    const mt = url.pathname.match(re);
    if (mt && m === req.method) {
      const r = await fn(env, req, mt.groups || {}, url);
      if (r instanceof Response) return r;
      if (Array.isArray(r)) return json(r[0], r[1]);
      return json(r);
    }
  }
  throw new ApiError(404, 'not_found');
}
