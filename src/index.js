import fetchOrig from 'isomorphic-fetch';
import omit from 'lodash/omit';

export const defaultConfig = {
  fetch: fetchOrig,
  baseUrl: '/',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
};

export function reset() {
  defaultConfig.fetch = fetchOrig;
  defaultConfig.baseUrl = '/';
  defaultConfig.headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
}

export function setFetch(fetch) {
  defaultConfig.fetch = fetch;
}

export function setBaseUrl(baseUrl) {
  defaultConfig.baseUrl = baseUrl;
}

export function addHeader(name, value) {
  defaultConfig.headers[name] = value;
}

const pathParamsPattern = new RegExp(':([a-z\-\d]+)', 'ig');

export function parseResponse(response) {
  if (response.status < 400) {
    if (response.status > 200) {
      return null;
    }

    return response.json();
  }

  return response.json()
    .then(err => Promise.reject(err));
}

function toQueryString(obj) {
  const parts = [];
  let value;
  for (let i in obj) {
    if (obj.hasOwnProperty(i)) {
      value = typeof obj[i] !== 'string' ? JSON.stringify(obj[i]) : obj[i];
      parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(value));
    }
  }

  return parts.join("&");
}

function parseParams(inputParams = {}, { path = '', method = 'get' }, baseUrl) {
  let url = baseUrl.lastIndexOf('/') === baseUrl.length - 1 ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
  url += `${path.indexOf('/') === 0 ? path : '/' + path}`;

  let execResult;
  const pathParams = [];
  while ((execResult = pathParamsPattern.exec(url)) !== null) {
    pathParams.push(execResult[1]);
  }

  pathParams.sort((a, b) => b.length - a.length)
    .forEach((param) => url = url.replace(`:${param}`, inputParams[param]));

  const isGet = method.toLowerCase() === 'get';
  const params = omit(inputParams, pathParams);
  const isParamsEmpty = Object.keys(params).length === 0;

  if (isGet && !isParamsEmpty) {
    url += (url.indexOf('?') !== -1 ? '&' : '?') + toQueryString(params);
  }

  return { url, method: method.toLowerCase(), body: !isGet && !isParamsEmpty ? params : undefined };
}

export default function api(methods, { baseUrl = defaultConfig.baseUrl, fetch = defaultConfig.fetch } = {}) {
  return Object.keys(methods)
    .reduce((api, methodName) => {
      let methodSpec = methods[methodName];

      if (typeof methodSpec === 'string') {
        const [method, path] = methodSpec.trim().split(' ');
        methodSpec = {
          method: ['get', 'post', 'delete', 'put', 'patch', 'head']
            .indexOf(method.toLowerCase()) !== -1 ? method : 'get',
          path: path || method
        };
      }

      const untitledMethod = (params) => {
        const { url, method, body } = parseParams(params, methodSpec, baseUrl);
        const headers = Object.assign({}, defaultConfig.headers, methodSpec.headers || {});
        const toJson = headers['Content-Type'] && headers['Content-Type'].indexOf('json') !== -1;

        return fetch(url, { method, body: toJson ? JSON.stringify(body) : body, headers })
          .then(parseResponse);
      };

      api[methodName] = new Function('method',
        `return function ${methodName}(params) { return method(params); };`
      )(untitledMethod);

      return api;
    }, {});
}