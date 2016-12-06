# to-api

Library `to-api` generates REST API methods using [`fetch`](https://fetch.spec.whatwg.org) under the hood.

## Usage

```js
import api from 'to-api';

const user = api({
  create: 'POST /',
  updateById: 'PUT /:id',
  deleteById: 'DELETE /:id',
  find: '/',
  findById: 'GET /:id'
}, { baseUrl: 'http://api/users' });

user.create({ email: 'user@example.com' })
  .then(response => ...);
```

More examples you can find in tests.