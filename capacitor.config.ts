import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kvsulur.dlms',
  appName: 'KV Sulur DLMS',
  webDir: 'dist',
  android: {
    buildOptions: {
      releaseType: 'APK',
    }
  }
};

export default config;
