// Web-platform globals for the Vercel AI SDK. First, before anything that
// could import `ai` — see src/polyfills/aiSdk.ts.
import './src/polyfills/aiSdk';
// crypto.getRandomValues for the agent email's key generation (viem/@noble).
import 'react-native-get-random-values';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import App from './App';
import './src/i18n';

AppRegistry.registerComponent(appName, () => App);
