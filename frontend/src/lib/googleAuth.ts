import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from './supabase';

// Detect if running inside standard Expo Go (store client), where custom native binary modules are not bundled
export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GoogleSigninModule: typeof import('@react-native-google-signin/google-signin') | null = null;

async function getGoogleSignin() {
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }
  if (GoogleSigninModule) {
    return GoogleSigninModule;
  }
  try {
    const mod = await import('@react-native-google-signin/google-signin');
    GoogleSigninModule = mod;
    return mod;
  } catch (e) {
    console.warn('[OmniQ] Native Google Sign-In module unavailable in this environment:', e);
    return null;
  }
}

export async function configureGoogleSignIn() {
  if (Platform.OS === 'web' || isExpoGo) {
    return;
  }
  try {
    const gModule = await getGoogleSignin();
    if (gModule?.GoogleSignin) {
      gModule.GoogleSignin.configure({
        webClientId: '706824175405-9a7gums7n4obvuukn1ftikk1m9s28crf.apps.googleusercontent.com',
      });
    }
  } catch (err) {
    console.warn('[OmniQ] Google Sign-In configuration skipped:', err);
  }
}

export interface GoogleSignInResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Fallback OAuth flow for Web browser and Expo Go (where native Google Play Services module is absent).
 */
async function signInWithGoogleOAuthFallback(): Promise<GoogleSignInResult> {
  try {
    const redirectUri = Linking.createURL('/');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) return { success: false, error: error.message };
    if (!data?.url) return { success: false, error: 'No OAuth authorization URL returned' };

    if (Platform.OS !== 'web') {
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      if (res.type === 'success' && res.url) {
        const parsed = Linking.parse(res.url);
        const hashParams = new URLSearchParams(
          res.url.includes('#') ? res.url.split('#')[1] : ''
        );
        const accessToken = hashParams.get('access_token') || (parsed.queryParams?.access_token as string);
        const refreshToken = hashParams.get('refresh_token') || (parsed.queryParams?.refresh_token as string);

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }
        return { success: true };
      }
      if (res.type === 'cancel' || res.type === 'dismiss') {
        return { success: false, error: 'User cancelled the login flow' };
      }
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[OmniQ] Google OAuth fallback error:', error);
    return { success: false, error: error.message || 'Google Sign-In failed' };
  }
}

/**
 * Main Google Sign-In entry point:
 * Uses Google Play Services native one-tap / sheet on standalone / dev-client builds.
 * Falls back to WebBrowser OAuth flow on Web and Expo Go.
 */
export async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  const gModule = await getGoogleSignin();

  // Web or Expo Go fallback
  if (!gModule || Platform.OS === 'web') {
    return signInWithGoogleOAuthFallback();
  }

  const { GoogleSignin, statusCodes } = gModule;
  try {
    await GoogleSignin.hasPlayServices();
    const response = (await GoogleSignin.signIn()) as any;
    const idToken = response?.data?.idToken || response?.idToken;

    if (!idToken) {
      throw new Error('No ID token present in Google Sign-In response');
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'User cancelled the login flow' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign in is in progress already' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Google Play services not available or outdated' };
    } else {
      console.error('[OmniQ] Native Google Sign-In error:', error);
      return { success: false, error: error.message || 'Google Sign-In error' };
    }
  }
}
