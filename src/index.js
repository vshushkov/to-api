import fetchOrig from 'isomorphic-fetch';

function isFunction(func) {
  return typeof func === 'function';
}

function omit(obj, fields) {
  return Object.keys(obj || {})
    .filter(key => fields.indexOf(key) === -1)
    .reduce((result, key) => Object.assign(result, { [key]: obj[key] }), {});
}

const pathParamsPattern = new RegExp(':([a-z-d]+)', 'ig');

const defaultHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

const empty = data => data;

export function defaultParseResponse(response) {
  if (response.status < 400) {
    if (response.status > 200) {
      return null;
    }

    return response.json();
  }

  return response.json().then(err => Promise.reject(err));
}

function defaultToQueryString(obj) {
  const parts = [];
  let value;
  for (let i in obj) {
    if (obj.hasOwnProperty(i)) {
      value = typeof obj[i] !== 'string' ? JSON.stringify(obj[i]) : obj[i];
      parts.push(encodeURIComponent(i) + '=' + encodeURIComponent(value));
    }
  }

  return parts.join('&');
}

function parseParams(
  _inputParams = {},
  methodSpec,
  baseUrl,
  transformRequest,
  toQueryString
) {
  let { path = '', method = 'get' } = methodSpec;
  let baseSearch = ''
  try {
    baseSearch = new URL(baseUrl).search
  } catch (e) {
    const idx = baseUrl.indexOf('?')
    if (idx !== -1) {
      baseSearch = baseUrl.substring(idx)
    }
  }
  const _baseUrl = baseUrl.replace(baseSearch, '')

  const inputParams = isFunction(transformRequest)
    ? transformRequest(_inputParams)
    : _inputParams;

  let url =
    _baseUrl.lastIndexOf('/') === _baseUrl.length - 1
      ? _baseUrl.substring(0, _baseUrl.length - 1)
      : _baseUrl;

  if (path && path !== '/') {
    url += path.indexOf('/') === 0 ? path : '/' + path;
  }

  url += baseSearch

  let execResult;
  const pathParams = [];
  while ((execResult = pathParamsPattern.exec(url)) !== null) {
    pathParams.push(execResult[1]);
  }

  pathParams
    .sort((a, b) => b.length - a.length)
    .forEach(param => (url = url.replace(`:${param}`, inputParams[param])));

  const isGet = method.toLowerCase() === 'get';
  const params = omit(inputParams, pathParams);
  const isParamsEmpty = Object.keys(params).length === 0;

  if (isGet && !isParamsEmpty) {
    url += (url.indexOf('?') !== -1 ? '&' : '?') + toQueryString(params);
  }

  return {
    url,
    method: method.toLowerCase(),
    body: !isGet && !isParamsEmpty ? params : undefined
  };
}

export class ApiCreator {
  constructor({
    baseUrl,
    fetch,
    parseResponse,
    transformRequest,
    transformResponse,
    headers,
    toQueryString = defaultToQueryString
  } = {}) {
    this.baseUrl = (baseUrl || '/').toString();
    this.fetch = fetch || fetchOrig;
    this.headers = Object.assign({}, defaultHeaders, headers || {});
    this.parseResponse = parseResponse || defaultParseResponse;
    this.transformRequest = transformRequest;
    this.transformResponse = transformResponse;
    this.toQueryString = toQueryString;

    if (!isFunction(this.parseResponse)) {
      throw new Error("to-api: 'parseResponse' is not a function");
    }

    if (this.transformRequest && !isFunction(this.transformRequest)) {
      throw new Error("to-api: 'transformRequest' is not a function");
    }

    if (this.transformResponse && !isFunction(this.transformResponse)) {
      throw new Error("to-api: 'transformResponse' is not a function");
    }

    if (!isFunction(this.fetch)) {
      throw new Error("to-api: 'fetch' is not a function");
    }

    this.addHeader = this.addHeader.bind(this);
    this.removeHeader = this.removeHeader.bind(this);
    this.getHeader = this.getHeader.bind(this);
    this.create = this.create.bind(this);
    this.clone = this.clone.bind(this);
  }

  clone({
    baseUrl = this.baseUrl,
    fetch = this.fetch,
    headers = this.headers,
    parseResponse = this.parseResponse,
    transformRequest = this.transformRequest,
    transformResponse = this.transformResponse,
    toQueryString = this.toQueryString
  } = {}) {
    return new ApiCreator({
      baseUrl,
      fetch,
      headers,
      parseResponse,
      transformRequest,
      transformResponse,
      toQueryString
    });
  }

  _getHeader(headers, rawName) {
    const name = Object.keys(headers).find(
      key => rawName.toLowerCase() === key.toLowerCase()
    );
    return { name, value: headers[name] };
  }

  getHeader(name) {
    const header = this._getHeader(this.headers, name);
    return header.value;
  }

  addHeader(rawName, value) {
    const { name } = this._getHeader(this.headers, rawName);
    this.headers[name || rawName] = value;
  }

  removeHeader(rawName) {
    const { name } = this._getHeader(this.headers, rawName);
    if (name) {
      delete this.headers[name];
    }
  }

  create(
    methods,
    {
      baseUrl = this.baseUrl,
      fetch = this.fetch,
      parseResponse = this.parseResponse,
      transformRequest = this.transformRequest,
      transformResponse = this.transformResponse,
      toQueryString = this.toQueryString
    } = {}
  ) {
    return Object.keys(methods).reduce((api, methodName) => {
      let methodSpec = methods[methodName];

      if (typeof methodSpec === 'string') {
        const [method, path] = methodSpec.trim().split(' ');
        methodSpec = {
          method:
            ['get', 'post', 'delete', 'put', 'patch', 'head'].indexOf(
              method.toLowerCase()
            ) !== -1
              ? method
              : 'get',
          path: path || method
        };
      }

      const untitledMethod = params => {
        const { url, method, body } = parseParams(
          params,
          methodSpec,
          baseUrl,
          isFunction(methodSpec.transformRequest)
            ? methodSpec.transformRequest
            : transformRequest,
          toQueryString
        );
        const headers = Object.assign(
          {},
          this.headers,
          (isFunction(methodSpec.headers)
            ? methodSpec.headers({ body, params })
            : methodSpec.headers) || {}
        );
        const contentType =
          this._getHeader(headers, 'content-type').value || '';
        const options = {
          method: method.toUpperCase(),
          headers: Object.keys(headers).reduce(
            (result, name) => ({
              ...result,
              ...(headers[name] ? { [name]: headers[name] } : {})
            }),
            {}
          ),
          body: contentType.indexOf('json') !== -1 ? JSON.stringify(body) : body
        };

        const _transformResponse = isFunction(methodSpec.transformResponse)
          ? methodSpec.transformResponse
          : isFunction(transformResponse)
            ? transformResponse
            : empty;

        const response = fetch(url, options).then(
          isFunction(methodSpec.parseResponse)
            ? methodSpec.parseResponse
            : parseResponse
        );

        if (isFunction(response.then)) {
          return response.then(_transformResponse);
        }

        return _transformResponse(response);
      };

      api[methodName] = new Function(
        'method',
        `return function ${methodName}(params) { return method(params); };`
      )(untitledMethod);

      return api;
    }, {});
  }
}

export default function apiCreator(config) {
  return new ApiCreator(config);
}
