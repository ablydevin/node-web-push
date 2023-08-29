// Pull in dependencies
const express = require('express');
require('dotenv').config()
const ably = require('ably');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const _ = require('lodash');

// Server settings with ExpressJS
const app = express();
const port = process.env.PORT || 3000;
const runningMessage = 'Server is running on port ' + port;

// Set up custom dependencies
// Constants just contains common messages so they're in one place
const constants = require('./constants');

// VAPID keys should only be generated once.
// use `web-push generate-vapid-keys --json` to generate in terminal
// then export them in your shell with the follow env key names
const vapidDetails = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
  subject: process.env.VAPID_SUBJECT
};

// Tell web push about our application server
webPush.setVapidDetails('mailto:email@domain.com', vapidDetails.publicKey, vapidDetails.privateKey);

(async() => {
  const client = new ably.Realtime.Promise(process.env.ABLY_API_KEY);
  await client.connection.once('connected');
  console.log('Connected to Ably!');

  // get the channel to subscribe to
  const channel = await client.channels.get('push-notification-proxy');
  /* 
    Subscribe to a channel. 
    The promise resolves when the channel is attached 
    (and resolves synchronously if the channel is already attached).
  */
  channel.subscribe((message) => {
    console.log(message)

    const notification = JSON.stringify({
      title: "Hello, Notifications!",
      options: {
        body: message.data
      }
    });

    const options = {
      TTL: 10000,
      vapidDetails: vapidDetails
    };

    subscriptions.forEach(s => {
      const subscription = JSON.parse(s)
      console.log(subscription)
      
      const endpoint = subscription.endpoint;
      console.log(`Endpoint: ${endpoint}`)

      const id = endpoint.substr((endpoint.length - 8), endpoint.length);
      webPush.sendNotification(subscription, notification, options)
        .then(result => {
          console.log(`Endpoint ID: ${id}`);
          console.log(`Result: ${result.statusCode}`);
        })
        .catch(error => {
          console.log(`Endpoint ID: ${id}`);
          console.log(`Error: ${error} `);
        });
    });
  });
})()

// Store subscribers in memory
let subscriptions = [];
console.log(subscriptions)

// Set up CORS and allow any host for now to test things out
// WARNING! Don't use `*` in production unless you intend to allow all hosts
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  return next();
});
app.use(express.static('public'));

// Allow clients to subscribe to this application server for notifications
app.post('/subscribe', (req, res) => {
  console.log(req)
  const body = JSON.stringify(req.body);
  let sendMessage;
  if (_.includes(subscriptions, body)) {
    sendMessage = constants.messages.SUBSCRIPTION_ALREADY_STORED;
  } else {
    subscriptions.push(body);

    sendMessage = constants.messages.SUBSCRIPTION_STORED;
  }
  console.log(`user subscribed`)

  res.send(sendMessage);
});

// Allow host to trigger push notifications from the application server
// app.post('/push', (req, res, next) => {
//   const pushSubscription = req.body.pushSubscription;
//   const notificationMessage = req.body.notificationMessage;

//   if (!pushSubscription) {
//     res.status(400).send(constants.errors.ERROR_SUBSCRIPTION_REQUIRED);
//     return next(false);
//   }

//   if (subscriptions.length) {
//     subscriptions.map((subscription, index) => {
//       let jsonSub = JSON.parse(subscription);

//       // Use the web-push library to send the notification message to subscribers
//       webPush
//         .sendNotification(jsonSub, notificationMessage)
//         .then(success => handleSuccess(success, index))
//         .catch(error => handleError(error, index));
//     });
//   } else {
//     res.send(constants.messages.NO_SUBSCRIBERS_MESSAGE);
//     return next(false);
//   }

//   function handleSuccess(success, index) {
//     res.send(constants.messages.SINGLE_PUBLISH_SUCCESS_MESSAGE);
//     return next(false);
//   }

//   function handleError(error, index) {
//     res.status(500).send(constants.errors.ERROR_MULTIPLE_PUBLISH);
//     return next(false);
//   }
// });

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.listen(port, () => console.log(runningMessage));
