const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-notifications requires the Android topic-subscription native module at import
// time, which Expo Go does not ship; swap in a shim that falls back to a no-op.
const topicShim = path.resolve(__dirname, 'src/shims/TopicSubscriptionModule.ts');
const upstreamResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === './TopicSubscriptionModule' && /expo-notifications[\\/]build/.test(context.originModulePath)) {
    return { type: 'sourceFile', filePath: topicShim };
  }
  return (upstreamResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
