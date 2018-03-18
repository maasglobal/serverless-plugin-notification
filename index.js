
const Promise = require('bluebird');

const Slack = require('./src/Slack');

class ServerlessPluginNotification {

  custom() {
    return Object.assign(
      this.serverless.service.custom.notification  || {}
    );
  }

  constructor(serverless, options) {
    this.serverless = serverless;
    this.invocationId = this.serverless.invocationId;
    this.options = options;
    this.service = this.serverless.service;

    this.hooks = {
      // before service deployment
      'before:deploy:deploy': () => Promise.bind(this)
        .then(() => Object.assign(this, this.getDeploymentInfo()))
        .then(() => this.buildDeploymentNotification('Deployment started', 'warning'))
        .then(notification => this.sendNotification(notification, this.serverless.cli.consoleLog)),

      // after service deployment
      'after:deploy:deploy': () => Promise.bind(this)
        .then(() => Object.assign(this, this.getDeploymentInfo()))
        .then(() => this.buildDeploymentNotification('Deployment succeeded', 'good'))
        .then(notification => this.sendNotification(notification, this.serverless.cli.consoleLog)),
    };
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
    const deployer = process.env.USER || process.env.LOGNAME || process.env.USERNAME || process.env.SUDO_USER || process.env.LNAME || this.custom().deployer || 'Unnamed deployer';
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

  sendNotification(notification, logger) {
    const promises = [];

    if (this.custom().slack) {
      var slackHandler = new Slack(this.custom().slack);
      promises.push(slackHandler.notify(notification, logger));
    }

    return Promise.all(promises);
  }
}

module.exports = ServerlessPluginNotification;
