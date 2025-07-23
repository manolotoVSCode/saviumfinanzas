import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8fc59cc6444d4d62a0eb07a2d8e07310',
  appName: 'saviumfinanzas',
  webDir: 'dist',
  server: {
    url: 'https://8fc59cc6-444d-4d62-a0eb-07a2d8e07310.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;