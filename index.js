const crypto = require('crypto');
const qs = require('querystring');
const request = require('superagent');
const Redis = require('ioredis');

const cache = {
  tokens: {},
  tickets: {}
};
const utils = module.exports;

/**
 * 配置
 * @param {Object} opts 
 */
utils.config = (opts) => {
  if (typeof opts === 'object'
    && !Array.isArray(opts)
    && Object.keys(opts).length > 0) {
    Object.assign(cache, opts);
  }
  if (cache.redis) {
    cache.redis = new Redis(cache.redis);
  }
}

/**
 * 获取缓存的access_token
 * @param {} tokenKey 
 */
utils.getCacheToken = async tokenKey => (cache.redis ? (await cache.redis.get(tokenKey)) : cache.tokens[tokenKey]);

/**
 * 缓存access_token
 * @param {} tokenKey 
 */
utils.setCacheToken = async (tokenKey, data) => {
  if (cache.redis) {
    return cache.redis.set(tokenKey, data.access_token, 'EX', data.expires_in);
  } else {
    cache.tokens[tokenKey] = data.access_token;
    setTimeout(() => (delete cache.tokens[tokenKey]), data.expires_in * 1000);
  }
};

/**
 * 获取access_token
 * @param {String} appKey 
 */
utils.access_token = async (appKey) => {
  if (!appKey) return null;

  const obj = cache.apps[appKey];
  if (!obj) return null;
  const { appid, secret, tokenKey } = obj;
  const cache_token = await utils.getCacheToken(tokenKey);
  if (cache_token) return cache_token;

  const url = `https://api.weixin.qq.com/cgi-bin/token`;
  const res = await request.get(url)
    .query({ grant_type: 'client_credential', appid, secret });

  const body = res.body;
  if (body.access_token && body.expires_in) {
    utils.setCacheToken(tokenKey, body);
    return body.access_token;
  } else if (body.errcode) {
    console.error(body.errmsg);
    if (body.errcode == '40002') {
      console.error('可能的错误：请确保grant_type字段值为client_credential');
    } else if (body.errcode == '40164') {
      console.error('可能的错误：调用接口的IP地址不在白名单中，请在接口IP白名单中进行设置');
    }
  }
  // 尝试10次
  for (let i = 1; i <= 10; i++) {
    try {
      const access_token = utils.access_token(appKey);
      if (access_token) {
        return access_token;
      }
    } catch (error) {
      console.warn(`第${i}次重试获取access_token异常：${error.message}`);
    }
  }
  console.error(`未知错误：${JSON.stringify(body, null, 0)}`);
  return null;
}

/**
 * 获取缓存的ticket
 * @param {} ticketKey 
 */
utils.getCacheTicket = async ticketKey => (cache.redis ? (await cache.redis.get(ticketKey)) : cache.tickets[ticketKey]);

/**
 * 缓存ticket
 * @param {} ticketKey 
 */
utils.setCacheTicket = async (ticketKey, data) => {
  if (cache.redis) {
    return cache.redis.set(ticketKey, data.ticket, 'EX', data.expires_in);
  } else {
    cache.tickets[ticketKey] = data.ticket;
    setTimeout(() => (delete cache.tickets[ticketKey]), data.expires_in * 1000);
  }
};

/**
 * 获取jsapi_ticket
 * @param {String} appKey
 */
utils.jsapi_ticket = async (appKey) => {
  if (!appKey) return null;

  const obj = cache.apps[appKey];
  if (!obj) return null;
  const { appid, secret, tokenKey, ticketKey } = obj;

  const ticket = await utils.getCacheTicket(ticketKey);
  if (ticket) return ticket;

  const access_token = await utils.access_token(appKey);
  if (!access_token) {
    console.error('access_token不存在');
    return access_token;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket`;
  const res = await request.get(url)
    .query({ access_token, type: 'jsapi' });

  const body = res.body;
  if (body.ticket && body.expires_in) {
    utils.setCacheTicket(ticketKey, body);
    return body.ticket;
  } else if (body.errcode) {
    console.error(body.errmsg);
  }
  // 尝试10次
  for (let i = 1; i <= 10; i++) {
    try {
      const ticket = utils.jsapi_ticket(appKey);
      if (ticket) {
        return ticket;
      }
    } catch (error) {
      console.warn(`第${i}次重试获取ticket异常：${error.message}`);
    }
  }
  console.error(`未知错误：${JSON.stringify(body, null, 0)}`);
  return null;
}

/**
 * 获取签名
 * @param {Object} obj 
 */
utils.signature = (obj) => {
  if (!obj) return null;
  const keys = Object.keys(obj).sort();
  const result = {};
  for (const key of keys) {
    if (!key || !obj[key]) return;
    result[key.toLowerCase()] = obj[key];
  }
  const rawstr = qs.stringify(result, null, null, { encodeURIComponent: str => str });
  const md5sum = crypto.createHash('sha1');
  md5sum.update(rawstr, 'utf8');
  const signstr = md5sum.digest('hex');
  return signstr;
}