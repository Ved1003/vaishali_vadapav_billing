import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.tanmay.billing',
    appName: 'Vaishali Vadapav',
    webDir: 'dist',
    server: {
        cleartext: true,
        androidScheme: 'http',
    },
    android: {
        allowMixedContent: true,
        backgroundColor: '#ffffff',
    },
    plugins: {
        StatusBar: {
            overlaysWebView: false,
            backgroundColor: '#ffffff',
            style: 'LIGHT'
        }
    }
};

export default config;
