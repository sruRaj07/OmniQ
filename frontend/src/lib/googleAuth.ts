import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export function configureGoogleSignIn() {
  if (Platform.OS !== 'web') {
    GoogleSignin.configure({
      webClientId: '706824175405-9a7gums7n4obvuukn1ftikk1m9s28crf.apps.googleusercontent.com',
    });
  }
}

export async function signInWithGoogleNative() {
  if (Platform.OS === 'web') {
    // Fallback for Web browser testing
    const redirectUri = Linking.createURL('/');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: false
      }
    });
    
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  // Native Android / iOS implementation
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn() as any;
    
    const idToken = response?.data?.idToken || response?.idToken;
    
    if (idToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
      return { success: true, data };
    } else {
      throw new Error('No ID token present!');
    }
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'User cancelled the login flow' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign in is in progress already' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Play services not available or outdated. Are you using Expo Go?' };
    } else {
      console.error(error);
      return { success: false, error: error.message };
    }
  }
}
