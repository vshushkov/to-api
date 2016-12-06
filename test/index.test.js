import expect from 'expect';
import api, { parseResponse, reset, addHeader, setFetch, setBaseUrl } from '../src';

const baseUrl = 'http://api/users/';
const createResponse = ({ status, body }) => ({ status, json: () => Promise.resolve(JSON.parse(body)) });

const fetch = (url, options) => {
  const body = JSON.stringify({ result: { url, options } });
  return Promise.resolve(createResponse({ status: url.indexOf('fail') !== -1 ? 400 : 200, body }));
};

function assert(user) {
  return Promise.all([
    user.create({ email: 'bla@bla.com' })
      .then(response => expect(response).toEqual({
        result: {
          url: `${baseUrl}`,
          options: {
            method: 'post',
            body: { email: 'bla@bla.com' },
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
          }
        }
      })),

    user.updateById({ id: '123', email: 'bla2@bla2.com' })
      .then(response => expect(response).toEqual({
        result: {
          url: `${baseUrl}123`,
          options: {
            method: 'put',
            body: { email: 'bla2@bla2.com' },
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        }
      })),

    user.deleteById({ id: '123' })
      .then(response => expect(response).toEqual({
        result: {
          url: `${baseUrl}123`,
          options: {
            method: 'delete',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        }
      })),

    user.find({ where: { email: 'bla@bla.com' } })
      .then(response => expect(response).toEqual({
        result: {
          url: `${baseUrl}?where=%7B%22email%22%3A%22bla%40bla.com%22%7D`,
          options: {
            method: 'get',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        }
      })),

    user.findById({ id: '123' })
      .then(response => expect(response).toEqual({
        result: {
          url: `${baseUrl}123`,
          options: {
            method: 'get',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        }
      }))
  ]);
}

describe('API', () => {

  it('create simple api', () => {
    reset();

    const user = api({
      create: {
        path: '/',
        method: 'post'
      },
      updateById: {
        path: '/:id',
        method: 'put'
      },
      deleteById: {
        path: '/:id',
        method: 'delete'
      },
      find: {
        path: '/',
        method: 'get'
      },
      findById: {
        path: '/:id',
        method: 'get'
      }
    }, { baseUrl, fetch });

    return assert(user);
  });

  it('create simple api short style', () => {
    reset();

    const user = api({
      create: 'POST /',
      updateById: 'PUT /:id',
      deleteById: 'DELETE /:id',
      find: '/',
      findById: 'GET /:id'
    }, { baseUrl, fetch });

    return assert(user);
  });

  it('handle error', () => {
    reset();

    const baseUrl = 'http://api/users';

    const user = api({
      fail: {
        path: '/fail/:bla',
        method: 'post'
      },
      findById: {
        path: '/:id',
        method: 'get'
      }
    }, { baseUrl, fetch });

    return user.fail({ bla: 'value', bla2: 'value' })
      .then(() => {
        throw new Error('Error not thrown');
      })
      .catch(errorResponse => expect(errorResponse).toEqual({
        result: {
          url: `${baseUrl}/fail/value`,
          options: {
            method: 'post',
            body: { bla2: 'value' },
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        }
      }))

  });

  it('default baseUrl and fetch', () => {
    reset();

    setBaseUrl('http://api/accounts');
    setFetch(fetch);
    addHeader('x-access-token', '123');

    const user = api({
      findById: {
        path: '/:id',
        method: 'get',
        headers: {
          'x-custom-header': 'custom-value'
        }
      }
    });

    return user.findById({ id: 'value' })
      .then(response => expect(response).toEqual({
        result: {
          url: 'http://api/accounts/value',
          options: {
            method: 'get',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'x-access-token': '123',
              'x-custom-header': 'custom-value'
            }
          }
        }
      }))

  });

  it('several path params', () => {
    reset();

    const model = api({
      method1: {
        path: '/:idOnceAgain/:id',
        method: 'get'
      },
      method2: {
        path: '/:id/:idOnceAgain',
        method: 'get'
      }
    }, { baseUrl, fetch });

    return Promise.all([
      model.method1({ id: 'value1', idOnceAgain: 'value2', anotherId: 'value3' })
        .then(response => expect(response).toEqual({
          result: {
            url: 'http://api/users/value2/value1?anotherId=value3',
            options: {
              method: 'get',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          }
        })),

      model.method2({ id: 'value1', idOnceAgain: 'value2' })
        .then(response => expect(response).toEqual({
          result: {
            url: 'http://api/users/value1/value2',
            options: {
              method: 'get',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            }
          }
        }))
    ])

  });

});