# to-api

Library `to-api` generates REST API client with [`fetch`](https://fetch.spec.whatwg.org) under the hood.

## Usage

```js
import create from 'to-api';

const clientApi = create({ baseUrl: 'http://api/users' });

clientApi
  .addHeader('Authorization', 'bearer ...')
  .processResponse(({ data }) => data);

const usersClient = clientApi({
  create: 'POST /',
  updateById: 'PUT /:id',
  deleteById: 'DELETE /:id',
  find: '/',
  findById: 'GET /:id'
});

(async () => {
    const newUser = await usersClient.create({ email: 'user@example.com' });
    const user = await usersClient.findById({ id: 'user-id' });
})();
```

More examples you can find in tests.
