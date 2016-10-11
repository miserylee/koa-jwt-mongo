## koa-jwt-mongo ![NPM version](https://img.shields.io/npm/v/koa-jwt-mongo.svg?style=flat)



### Installation
```bash
$ npm install koa-jwt-mongo --save
```

### Example
```js
const jwtMongo = require('koa-jwt-mongo');
const app = require('koa')();

app.use(jwtMongo({
  uri: 'mongodb://localhost/jwt-mongo',
  mongoOptions: {},
  collection: 'tokens',
  jwtOptions: {
    secret: 'jwt-token',
    key: 'user'
  },
  jwtUnless: {
    path: '/token'
  },
  jwtExp: '7 days'
}));

// Generate a json web token and save it
app.use(function * () {
  this.body = yield this.token.create({
    username: 'Misery'
  });
});

// Revoke the jwt the request contains
app.use(function * () {
  yield this.token.destroy();
  this.status = 204;
});

// Get token list by certian query
app.use(function * () {
  this.body = yield this.token.list({
    username: 'Misery'
  });
});
```
check more details in `Example/index.js`

### API
#### jwtMongo
##### options {`Object`}
* uri {`String`} `required` The mongo uri to connect the mongodb.
* mongoOptions {`Object`} `optional` The mongo connect options, [check details](http://mongodb.github.io/node-mongodb-native/2.2/reference/connecting/connection-settings/).
* collection {`String`} `required` `default: 'tokens'` The collection to save the token.
* jwtOptions {`Object`} `optional` The koa-jwt options, [check details](https://github.com/koajs/jwt).
* jwtUnless {`Object|Function`} `optional` The koa-jwt unless options.
* jwtExp {`String`} `required` `default: '7 days'` The expires of the token, it's [ms](https://github.com/zeit/ms) style.
* enableCheck {`Boolean`} `optional` `default: true` If enable to check the token from the collection when a request reached.

A `token` object will attach to koa context.
#### token {`Object`}
* collection {[Collection](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html)} The collection where tokens saved.
* create {`GeneratorFunction(payload)`} Generate a token with payload and save it. The payload is an object contains business data.
* check {`GeneratorFunction()`} Check if current token of the request has revoked, if the token was revoked, `401` will throw.
* read {`GeneratorFunction()`} Read current token of the request from collection without check.
* destroy {`GeneratorFunction()`} Revoke current token of the request.
* list {`GeneratorFunction(query)`} Fetch the list of tokens with the `query` of business payload.

### Contributing
- Fork this Repo first
- Clone your Repo
- Install dependencies by `$ npm install`
- Checkout a feature branch
- Feel free to add your features
- Make sure your features are fully tested
- Publish your local branch, Open a pull request
- Enjoy hacking <3

### MIT license
Copyright (c) 2016 Misery Lee &lt;miserylee@foxmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the &quot;Software&quot;), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---
built upon love by [docor](git+https://github.com/turingou/docor.git) v0.3.0
