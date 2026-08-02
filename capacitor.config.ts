import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.learnspanglish.mobile',
  appName: 'Spanglish',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
