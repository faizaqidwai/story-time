import 'react-native-url-polyfill/auto';
import { Client, Account, Databases } from 'react-native-appwrite';

const client = new Client();

client
  .setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID)
  .setPlatform('com.storytime.app'); // required for React Native


export const account = new Account(client);
export const databases = new Databases(client);
export default {databases};
