import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ge.geoguide.app',
  appName: 'GeoGuide',
  webDir: 'out',
  server: {
    url: 'https://www.geoguide.ge',
    cleartext: true
  }
};

export default config;
