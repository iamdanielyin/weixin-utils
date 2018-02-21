# WeChat-Utils

WeChat development tools module.

## Install

```sh
npm install wechat-utils
```

## Usage

```js
const utils = require('wechat-utils');
// 注册配置
utils.config({
  redis: 'redis://localhost:6379',
  apps: {
    myApp: {
      appid: 'xxx',
      secret: 'xxx',
      tokenKey: 'access_token',
      ticketKey: 'tools_ticket'
    }
  }
});
// 调用API
utils.access_token('myApp').then(access_token => console.log(access_token));
```

## API

>工具库内部会对获取到的 `access_token` 和 `jsapi_ticket` 进行缓存（若配置了`redis`则缓存到Redis中，反之则缓存到内存中），过期将自动刷新。

#### `utils.config(opts)`

配置注册函数，接收一个`Object`类型的配置对象，对象结构参考以上示例，其中`redis`非必填参数，当`redis`为空时采用内存模式，即每次应用重启则清空缓存信息。

#### `utils.access_token(appKey)`

获取`access_token`，需要传入一个`appKey`（`appKey`即为配置对象中的`apps`部分的`key`），返回一个`Promise`对象，该函数内部会自动检测是否存在缓存的令牌（默认在每次获取令牌后）。

#### `utils.jsapi_ticket(appKey)`

获取`jsapi_ticket`，同样需要传入一个`appKey`，返回值也为一个`Promise`对象。