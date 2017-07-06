
const Promise = require('bluebird');

const Slack = require('./src/Slack');

class ServerlessPluginNotification {

  constructor(serverless, options) {
    this.serverless = serverless;
    this.invocationId = this.serverless.invocationId;
    this.options = options;
    this.service = this.serverless.service;
    this.settings = this.getNotificationSettings();

    if (this.settings.slack) {
      this.slackHandler = new Slack(this.settings.slack);
    }

    this.hooks = {
      // before service deployment
      'before:deploy:deploy': () => Promise.bind(this)
        .then(() => Object.assign(this, this.getDeploymentInfo()))
        .then(() => this.buildDeploymentNotification('Deployment started', 'warning'))
        .then(this.sendNotification),

      // after service deployment
      'after:deploy:deploy': () => Promise.bind(this)
        .then(() => Object.assign(this, this.getDeploymentInfo()))
        .then(() => this.buildDeploymentNotification('Deployment succeeded', 'good'))
        .then(this.sendNotification),
    };
  }

  getNotificationSettings() {
    const settings = this.service.custom.notification || {};
    return settings;
  }

  getDeploymentInfo() {
    const functions = this.service.getAllFunctions();

    const endpoints = functions
      .map(func => this.service.getAllEventsInFunction(func))
      .reduce((acc, curr) => acc.concat(curr.filter(i => i.http)), [])
      .map(i => i.http);

    return {
      provider: this.service.provider,
      functions,
      endpoints,
    };
  }

  buildDeploymentNotification(message, severity) {
    const deployer = process.env.USER || process.env.LOGNAME || process.env.USERNAME || process.env.SUDO_USER || process.env.LNAME || this.settings.deployer || 'Unnamed deployer';
    return {
      deployer,
      invocationId: this.invocationId,
      message,
      providerName: this.provider.name,
      stage: this.options.stage || this.provider.stage,
      region: this.options.region || this.provider.region,
      runtime: this.provider.runtime,
      functions: this.functions,
      endpoints: this.endpoints,
      severity,
    };
  }

  sendNotification(notification) {
    const promises = [];

    if (this.slackHandler) {
      promises.push(this.slackHandler.notify(notification));
    }

    return Promise.all(promises);
  }
}

module.exports = ServerlessPluginNotification;
