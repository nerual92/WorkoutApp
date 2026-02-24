const path = require('path');

module.exports = {
  project: {
    android: {
      sourceDir: path.resolve(__dirname, 'android'),
      appName: 'app',
      packageName: 'com.sbs.workouttracker',
    },
  },
  // Tell React Native where to find dependencies in monorepo
  dependencies: {},
};
