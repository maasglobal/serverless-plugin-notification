
const request = require('request-promise-lite');

class Webhook {
  constructor(settings) {
    this.url = settings.url;
    this.headers = settings.headers || {};
  }

  notify(notification, logger) {

    if (!this.url) return Promise.reject(new Error('Cannot send webhook notification without url'));

    const query = {
      headers: Object.assign(this.headers, {
        'Content-Type': 'application/json',
      }),
      json: true,
      body: notification,
    };

    return request.post(this.url, query);

  }
}

module.exports = Webhook;
