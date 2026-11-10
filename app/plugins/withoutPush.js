// TASA only uses local reminders, never push. expo-notifications adds the
// push entitlement, which our App Store profile doesn't have, so remove it.
const { withEntitlementsPlist } = require("expo/config-plugins");

module.exports = function withoutPush(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults["aps-environment"];
    return c;
  });
};
