import expect from 'expect';
import apiCreator, { parseResponse } from '../src';

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
            method: 'POST',
            body: "{\"email\":\"bla@bla.com\"}",
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
          }
        }
      })),

    user.updateById({ id: '123', email: 'bla2@bla2.com' })
      .then(response => expect(response).toEqual({
        result: {
          url: `${baseUrl}123`,
          options: {
            method: 'PUT',
            body: "{\"email\":\"bla2@bla2.com\"}",
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        }
      })),

    user.patchById({ id: '123', email: 'bla3@bla3.com' })
      .then(response => expect(response).toEqual({
        result: {
          url: `${baseUrl}123`,
          options: {
            method: 'PATCH',
            body: "{\"email\":\"bla3@bla3.com\"}",
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
            method: 'DELETE',
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
            method: 'GET',
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
            method: 'GET',
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
    const creator = apiCreator({ baseUrl, fetch });

    const user = creator.create({
      create: {
        path: '/',
        method: 'POST'
      },
      updateById: {
        path: '/:id',
        method: 'PUT'
      },
      patchById: {
        path: '/:id',
        method: 'PATCH'
      },
      deleteById: {
        path: '/:id',
        method: 'DELETE'
      },
      find: {
        path: '/',
        method: 'GET'
      },
      findById: {
        path: '/:id',
        method: 'GET'
      }
    });

    return assert(user);
  });

  it('create simple api short style', () => {
    const creator = apiCreator({ baseUrl, fetch });

    const user = creator.create({
      create: 'POST /',
      updateById: 'PUT /:id',
      patchById: 'PATCH /:id',
      deleteById: 'DELETE /:id',
      find: '/',
      findById: 'GET /:id'
    });

    return assert(user);
  });

  it('handle error', () => {
    const baseUrl = 'http://api/users';
    const creator = apiCreator({ baseUrl, fetch });

    const user = creator.create({
      fail: {
        path: '/fail/:bla',
        method: 'POST'
      },
      findById: {
        path: '/:id',
        method: 'GET'
      }
    });

    return user.fail({ bla: 'value', bla2: 'value' })
      .then(() => {
        throw new Error('Error not thrown');
      })
      .catch(errorResponse => expect(errorResponse).toEqual({
        result: {
          url: `${baseUrl}/fail/value`,
          options: {
            method: 'POST',
            body: "{\"bla2\":\"value\"}",
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        }
      }))

  });

  it('setting custom baseUrl, fetch and headers', () => {
    const creator = apiCreator({
      fetch,
      baseUrl: 'http://api/accounts',
      headers: {
        'x-access-token': '123'
      }
    });

    const user = creator.create({
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
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'x-access-token': '123',
              'x-custom-header': 'custom-value'
            }
          }
        }
      }))
      .then(() => {
        creator.addHeader('x-access-token2', '123');
        creator.addHeader('x-access-token', '234');
      })
      .then(() => user.findById({ id: 'value2' }))
      .then(response => expect(response).toEqual({
        result: {
          url: 'http://api/accounts/value2',
          options: {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'x-access-token2': '123',
              'x-access-token': '234',
              'x-custom-header': 'custom-value'
            }
          }
        }
      }));
  });

  it('getting headers', () => {
    const creator = apiCreator({
      fetch,
      baseUrl: 'http://api/accounts',
      headers: {
        'x-access-token': '123'
      }
    });

    expect(creator.getHeader('x-access-token')).toEqual('123');
    expect(creator.getHeader('X-Access-Token')).toEqual('123');

    creator.addHeader('some-header', 'some-value');

    expect(creator.getHeader('some-header')).toEqual('some-value');
  });

  it('remove headers', () => {
    const creator = apiCreator({ fetch });

    creator.removeHeader('content-type');

    const user = creator.create({ findById: 'GET /:id' });

    return user.findById({ id: 'value' })
      .then(response => expect(response).toEqual({
        result: {
          url: '/value',
          options: {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          }
        }
      }));
  });

  it('several path params', () => {
    const creator = apiCreator();

    const model = creator.create({
      method1: {
        path: '/:idOnceAgain/:id',
        method: 'GET'
      },
      method2: {
        path: '/:id/:idOnceAgain',
        method: 'GET'
      }
    }, { baseUrl, fetch });

    return Promise.all([
      model.method1({ id: 'value1', idOnceAgain: 'value2', anotherId: 'value3' })
        .then(response => expect(response).toEqual({
          result: {
            url: 'http://api/users/value2/value1?anotherId=value3',
            options: {
              method: 'GET',
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
              method: 'GET',
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
