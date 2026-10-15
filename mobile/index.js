import { AppRegistry } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Required by Firebase. The system displays the notification itself.
setBackgroundMessageHandler(getMessaging(getApp()), async () => {});

AppRegistry.registerComponent(appName, () => App);
