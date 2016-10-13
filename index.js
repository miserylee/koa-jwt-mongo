require('tlan');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectID;
const jwt = require('koa-jwt');
const debug = require('debug')('koa-jwt-mongo');

module.exports = ({
  uri,
  collection = 'tokens',
  mongoOptions = {},
  jwtOptions = {},
  jwtUnless = {},
  jwtExp = '7 days',
  enableCheck = true
} = {}) => {

  let db;

  const Token = function () {
    const c = db.collection(collection);
    return {
      collection: c,
      create: function * (payload = {}) {
        if (typeof payload !== 'object') throw new Error('payload should be an object.');
        const expires = jwtExp.after(new Date());
        const jti = new ObjectId;
        payload = Object.assign({
          jti,
          exp: expires.unix,
          iss: jwtOptions.issuer
        }, payload);
        const result = yield c.insertOne({
          _id: jti,
          jti,
          jwt: jwt.sign(payload, jwtOptions.secret),
          payload,
          expires
        });
        return yield c.findOne({ _id: result.insertedId });
      },
      check: function * () {
        const auth = this.state[jwtOptions.key || 'user'];
        if (auth) {
          const token = yield c.findOne({ jti: ObjectId(auth.jti) });
          if (!token && !jwtOptions.passthrough) {
            this.throw(401, 'Token was revoked!');
          } else if (!token) {
            this.state[jwtOptions.key || 'user'] = undefined;
          }
        }
      }.bind(this),
      read: function * () {
        const auth = this.state[jwtOptions.key || 'user'];
        if (auth) {
          return yield c.findOne({ jti: ObjectId(auth.jti) });
        }
      }.bind(this),
      destroy: function * () {
        const auth = this.state[jwtOptions.key || 'user'];
        if (auth) {
          yield c.removeOne({ jti: ObjectId(auth.jti) });
        }
      }.bind(this),
      list: function * (query) {
        const q = {};
        Object.keys(query).forEach(key => q[`payload.${key}`] = query[key]);
        return yield c.find(q).toArray();
      }
    };
  };

  function * jwtMongo (next) {
    if (!db) {
      db = yield MongoClient.connect(uri, mongoOptions);
      yield db.collection(collection).createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
      yield db.collection(collection).createIndex({ jti: 1 });

      debug('DB connected!');
    }
    this.Token = Token.bind(this)();
    yield next;
  }

  function * checkValid (next) {
    yield this.Token.check();
    yield next;
  }

  return function * (next) {
    if (enableCheck) {
      next = checkValid.bind(this)(next);
    }
    next = jwtMongo.bind(this)(next);
    yield jwt(jwtOptions).unless(jwtUnless).bind(this)(next);
  };

};

