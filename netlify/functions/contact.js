const serverless = require("serverless-http");
const app = require("../../server");

const handler = serverless(app);

exports.handler = (event, context) => handler({
  ...event,
  path: "/contact"
}, context);
