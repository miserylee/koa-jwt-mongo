require('tlan');
const jwt = require('koa-jwt');
const debug = require('debug')('koa-jwt-mongo');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;

const schema = new Schema({
  jti: { type: Schema.ObjectId, index: true, required: true, unique: true },
  jwt: { type: String, required: true },
  payload: {},
  expires: { type: Date, expires: 0, index: true },
  meta: {}
});

class Token {
  constructor ({ connection, modelName, jwtOptions, jwtExp }) {
    this.Model = connection.model(modelName, schema);
    this._jwtOptions = jwtOptions;
    this._jwtExp = jwtExp;
  }

  * create (payload = {}) {
    if (typeof payload !== 'object') throw new Error('payload should be an object.');
    const expires = this._jwtExp.after(new Date());
    const jti = new ObjectId;
    payload = Object.assign({
      jti,
      exp: expires.unix,
      iss: this._jwtOptions.issuer
    }, payload);
    return yield this.Model.create({
      _id: jti,
      jti,
      jwt: jwt.sign(payload, this._jwtOptions.secret),
      payload,
      expires,
      meta: {}
    });
  }

  * update (jti, payload = {}) {
    if (typeof payload !== 'object') throw new Error('payload should be an object.');
    const expires = this._jwtExp.after(new Date());
    payload = Object.assign({
      jti,
      exp: expires.unit,
      iss: this._jwtOptions.issuer
    }, payload);
    return yield this.Model.findByIdAndUpdate(jti, {
      $set: {
        jwt: jwt.sign(payload, this._jwtOptions.secret),
        payload,
        expires
      }
    }, { new: true });
  }

  * readMeta (jti) {
    const token = yield this.read(jti);
    return token.meta;
  }

  * setMeta (jti, meta) {
    yield this.Model.findByIdAndUpdate(jti, {
      $set: {
        meta
      }
    });
  }

  * check (jti) {
    const token = yield this.read(jti);
    if (!token && !this._jwtOptions.passthrough) {
      throw new Error('Token was revoked!');
    } else return !!token;
  }

  * read (jti) {
    return yield this.Model.findById(jti);
  }

  * destroy (jti) {
    yield this.Model.findByIdAndRemove(jti);
  }

  * list (query) {
    const q = {};
    Object.keys(query).forEach(key => q[`payload.${key}`] = query[key]);
    return yield this.Model.find(q);
  }

  * destroyMany (query) {
    const q = {};
    Object.keys(query).forEach(key => q[`payload.${key}`] = query[key]);
    yield this.Model.remove(q);
  }
}

module.exports = ({
  connection,
  modelName,
  jwtOptions = {},
  jwtUnless = {},
  jwtExp = '7 days',
  enableCheck = true
}) => {
  const token = new Token({ connection, modelName, jwtOptions, jwtExp });

  function * checkValid (next) {
    const auth = this.state[jwtOptions.key || 'user'];
    this.Token = {
      Model: token.Model,
      * create (payload) {
        return yield token.create(payload);
      },
      * update (payload) {
        if (auth) {
          return yield token.update(auth.jti, payload);
        }
      },
      * setMeta (meta) {
        if (auth) {
          return yield token.setMeta(auth.jti, meta);
        }
      },
      * readMeta () {
        if (auth) {
          return yield token.readMeta(auth.jti)
        }
      },
      check: function * () {
        if (auth) {
          try {
            const result = yield token.check(auth.jti);
            if (!result) {
              this.state[jwtOptions.key || 'user'] = undefined;
            }
          } catch (err) {
            this.throw(401, err.message);
          }
        }
      }.bind(this),
      * read () {
        if (auth) {
          return yield token.read(auth.jti);
        }
      },
      * destroy () {
        if (auth) {
          return yield token.destroy(auth.jti);
        }
      },
      * list (query) {
        return yield token.list(query);
      },
      * destroyMany (query) {
        return yield token.destroyMany(query);
      }
    };
    if (enableCheck && auth) {
      yield this.Token.check(auth.jti);
    }
    yield next;
  }

  return {
    middleware: function * (next) {
      next = checkValid.bind(this)(next);
      yield jwt(jwtOptions).unless(jwtUnless).bind(this)(next);
    },
    token
  }
};