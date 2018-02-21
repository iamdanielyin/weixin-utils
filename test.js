const utils = require('./index');

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

utils.access_token('myApp').then(access_token => {
  console.log(access_token);
  utils.jsapi_ticket('myApp').then(ticket => console.log(ticket));
});