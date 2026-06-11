import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rehearse.app',
  appName: 'Rehearse',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#181818',
  },
};

export default config;
