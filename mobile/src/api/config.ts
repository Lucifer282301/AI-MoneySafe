import { Platform } from 'react-native';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

// Replace the production URL with your deployed backend (must be https)
export const API_URL = __DEV__
  ? `http://${DEV_HOST}:4000/api`
  : 'https://ai-moneysafe.onrender.com/api';
