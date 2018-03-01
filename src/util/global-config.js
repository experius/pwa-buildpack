const debug = require('./debug').here(__filename);
const { resolve } = require('path');
const { homedir } = require('os');
const { createHash } = require('crypto');
const flatfile = require('flat-file-db');

class GlobalConfig {
    static getDbFilePath() {
        return resolve(homedir(), './.config/pwa-buildpack.db');
    }
    static async db() {
        if (!this._dbPromise) {
            this._dbPromise = new Promise((joy, pain) => {
                try {
                    const dbFilePath = this.getDbFilePath();
                    debug(`no cached db exists, pulling db from ${dbFilePath}`);
                    const db = flatfile(dbFilePath);
                    debug(`db created, waiting for open event`, db);
                    db.on('open', () => {
                        debug('db open, fulfilling to subscribers');
                        joy(db);
                    });
                } catch (e) {
                    pain(e);
                }
            });
        }
        return this._dbPromise;
    }
    constructor(options) {
        // validation
        if (typeof options !== 'object') {
            throw Error(debug.errorMsg('Must provide options.'));
        }

        const { key, prefix } = options;

        if (typeof key !== 'function') {
            throw Error(
                debug.errorMsg('Must provide a `key` function in options.')
            );
        }

        if (typeof prefix !== 'string') {
            throw Error(
                debug.errorMsg('Must provide a `prefix` string in options.')
            );
        }

        this._makeKey = key;
        this._prefix = prefix;
    }
    makeKey(keyparts) {
        if (keyparts.length !== this._makeKey.length) {
            throw Error(
                `Wrong number of arguments sent to produce unique ${
                    this._prefix
                } key`
            );
        }
        if (keyparts.length === 0) {
            // a scalar, then
            return this._prefix;
        }
        const hash = createHash('md5');
        const key = this._makeKey(...keyparts);
        if (typeof key !== 'string') {
            throw Error(
                debug.errorMsg(
                    `key function ${this._makeKey.toString()} returned a non-string value: ${key}: ${typeof key}`
                )
            );
        }
        hash.update(key);
        return this._prefix + hash.digest('hex');
    }
    async get(...keyparts) {
        debug(`${this._prefix} get()`, keyparts);
        const db = await this.constructor.db();
        const key = this.makeKey(keyparts);
        debug(`${this._prefix} get()`, keyparts, `made key: ${key}`);
        return db.get(key);
    }
    async set(...args) {
        debug(`${this._prefix} set()`, ...args);
        const db = await this.constructor.db();
        const key = this.makeKey(args.slice(0, -1));
        debug(`${this._prefix} set()`, args, `made key: ${key}`);
        return new Promise((yay, boo) =>
            db.put(
                key,
                args.slice(-1)[0],
                (err, res) => (err ? boo(err) : yay(res))
            )
        );
    }
    async del(...keyparts) {
        const db = await this.constructor.db();
        const key = this.makeKey(keyparts);
        return new Promise((wow, ow) =>
            db.del(key, (err, res) => (err ? ow(err) : wow(res)))
        );
    }
    async values(xform = x => x) {
        const db = await this.constructor.db();
        return db.keys().reduce((out, k) => {
            if (k.indexOf(this._prefix) === 0) {
                out.push(xform(db.get(k)));
            }
            return out;
        }, []);
    }
    async clear() {
        const db = await this.constructor.db();
        return new Promise((cool, fool) =>
            db.clear(e => (e ? fool(e) : cool()))
        );
    }
}
module.exports = GlobalConfig;
