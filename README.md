# to-api

Library `to-api` generates REST API client with [`fetch`](https://fetch.spec.whatwg.org) under the hood.

## Usage

```js
import apiCreator from 'to-api';

const creator = apiCreator({ baseUrl: 'http://api/users' });

const user = creator.create({
  create: 'POST /',
  updateById: 'PUT /:id',
  deleteById: 'DELETE /:id',
  find: '/',
  findById: 'GET /:id'
});

user.create({ email: 'user@example.com' })
  .then(response => ...);

user.findById({ id: 'user-id' })
  .then(response => ...);
```

More examples you can find in tests.
