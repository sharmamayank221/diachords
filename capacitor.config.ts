import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.chordsofguitar.app",
  appName: "ChordsofGuitar",
  webDir: "out",
  backgroundColor: "#000000",
  ios: {
    scheme: "ChordsofGuitar",
    contentInset: "never",
    backgroundColor: "#000000",
    limitsNavigationsToAppBoundDomains: false,
    preferredContentMode: "mobile",
  },
  plugins: {
    SplashScreen: {
      // _app hides it once the first page has rendered
      launchAutoHide: false,
      launchFadeOutDuration: 200,
      backgroundColor: "#000000",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      overlaysWebView: true,
    },
    Keyboard: {
      resize: "native",
      style: "DARK",
    },
  },
};

export default config;
