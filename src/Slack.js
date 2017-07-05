
const request = require('request-promise-lite');

const SLACK_BASEURL = 'https://slack.com/api';

class Slack {
  constructor(settings) {
    this.token = settings.token;
    this.channel = settings.channel;
    this.username = settings.username || 'Serverless Notification';
  }

  buildPost(notification) {

    return {
      attachments: [
        {
          color: notification.severity,
          title: notification.message,
          text: `Invocation ID: ${notification.invocationId}\nStage: ${notification.stage}\nRegion: ${notification.region}
          `,
          author_name: 'Serverless Plugin Notification',
          author_link: 'https://github.com/maasglobal/serverless-plugin-notification',
          mrkdwn: true,
          fields: [
            {
              title: 'Provider',
              value: `${notification.providerName}`,
              short: 'true',
            },
            {
              title: 'Lambda runtime',
              value: `${notification.runtime}`,
              short: 'true',
            },
            {
              title: 'Number of lambdas',
              value: `${notification.functions.length}`,
              short: 'true',
            },
            {
              title: 'Number of endpoints',
              value: `${notification.endpoints.length}`,
              short: 'true',
            },
          ],
        },
      ],
    };
  }

  buildReply(notification) {
    const formatEndpoint = (endpointObj) => `${endpointObj.method}~${endpointObj.path}`;
    return {
      functions: [
        {
          title: 'Function listing',
          color: '#49311c',
          text: `\n${notification.functions.join('\n')}`,
          mrkdwn: true,
        },
      ],
      endpoints: [
        {
          title: 'Endpoint listing',
          color: '#49311c',
          text: `\n${notification.endpoints.map(formatEndpoint).join('\n')}`,
          mrkdwn: true,
        },
      ],
    };
  }

  notify(notification, log) {
    if (!this.token) throw new Error('Cannot send slack notification without slack token');
    if (!this.channel) throw new Error('Cannot send slack notification without a specified channel');

    const message = this.buildPost(notification);
    const reply = this.buildReply(notification);

    // Post general information as a new post
    const queryMessage = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      json: true,
      form: {
        token: this.token,
        channel: this.channel,
        attachments: JSON.stringify(message.attachments),
        username: this.username,
      },
    };

    return request.post(`${SLACK_BASEURL}/chat.postMessage`, queryMessage)
      .then(response => {

        if (response.ok === false) throw new Error(response);

        // All good
        console.info('[Serverless Plugin Notification | Slack] Succesfully sent notification message');

        // Put function and endpoint listing to reply
        return Promise.all(Object.keys(reply).map(key => {
          const queryReply = {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            json: true,
            form: {
              token: this.token,
              channel: this.channel,
              thread_ts: response.ts,
              attachments: JSON.stringify(reply[key]),
              username: this.username,
            },
          };
          return request.post(`${SLACK_BASEURL}/chat.postMessage`, queryReply)
            .then(response => {
              if (response.ok === false) throw new Error(response);
              // All good
              console.info('[Serverless Plugin Notification | Slack] Succesfully sent notification reply');
            });
        }));
      })
      .catch(error => {
        console.error(`[Serverless Plugin Notification | Slack] error sending one of the message, error \n${JSON.stringify(error)}`);
        return;
      });
  }
}


module.exports = Slack;
