const jwtMongo = require('../');
const app = require('koa')();
const jwt = require('koa-jwt');

const secret = 'koa-jwt-mongo';

app.use(jwtMongo({
  uri: 'mongodb://localhost/jwt-mongo',
  collection: 'tokens',
  jwtOptions: {
    secret,
    key: 'auth',
    issuer: 'kjm'
  },
  jwtUnless: {
    path: '/token'
  },
  jwtExp: '2 seconds'
}));

const mount = function (path, middleware) {
  return function * (next) {
    if (path === this.path) {
      yield middleware.bind(this)(next);
    } else {
      yield next;
    }
  }
};

app.use(mount('/', function * () {
  this.body = {
    hello: 'world'
  };
}));

app.use(mount('/token', function * () {
  this.body = yield this.Token.create(this.query);
}));

app.use(mount('/destroyToken', function * () {
  yield this.Token.destroy();
  this.status = 204;
}));

app.use(mount('/tokens', function * () {
  this.body = yield this.Token.list(this.query);
}));

app.on('error', err => console.error(err.message));

const request = require('supertest').agent(app.listen());

const delay = delay => new Promise(resolve => setTimeout(resolve, delay));

require('co')(function * () {
  // Unauthorized with no token
  request.get('/').expect(401);
  console.log('Unauthorized with no token');

  // Get token use username
  var { body } = yield request.get('/token?username=Misery');
  console.log(`Got token payload: ${JSON.stringify(body.payload)}`);

  // Request protected resource use token
  var token = `Bearer ${body.jwt}`;
  var { body } = yield request.get('/').set('Authorization', token);
  console.log(`Got protected resource: ${JSON.stringify(body)}`);

  console.log('Waiting...');
  // Wait for token expires
  yield delay(3000);

  // Unauthorized with invalid token
  yield request.get('/').set('Authorization', token).expect(401);
  console.log('Unauthorized with invalid token');

  // Get token use username
  var { body } = yield request.get('/token?username=Misery');
  console.log(`Got token payload: ${JSON.stringify(body.payload)}`);

  // Request protected resource use token
  var token = `Bearer ${body.jwt}`;
  var { body } = yield request.get('/').set('Authorization', token);
  console.log(`Got protected resource: ${JSON.stringify(body)}`);

  // Destroy token before expires
  yield request.get('/destroyToken').set('Authorization', token).expect(204);
  console.log('Token was revoked');

  // Unauthorized with revoked token
  yield request.get('/').set('Authorization', token).expect(401);
  console.log('Unauthorized with revoked token');

  // Request more tokens
  var { body } = yield request.get('/token?username=Joker');
  yield request.get('/token?username=Joker');
  yield request.get('/token?username=Joker');
  console.log('Invoked 3 tokens');

  // List tokens by username
  var token = `Bearer ${body.jwt}`;
  var { body } = yield request.get('/tokens?username=Joker').set('Authorization', token);
  console.log(`Got token list: ${body.length} tokens`);
}).catch(console.error);