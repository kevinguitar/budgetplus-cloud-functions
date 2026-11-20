// Join dates are formatted in local time; pin it so tests behave the same
// everywhere. Cloud Functions also run in UTC.
module.exports = () => {
  process.env.TZ = "UTC";
};
