import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.moneysafe.session';

export interface Session {
  accessToken: string;
  refreshToken: string;
}

let cache: Session | null = null;

export const getSession = (): Session | null => cache;

export async function loadSession(): Promise<Session | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    cache = creds ? (JSON.parse(creds.password) as Session) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export async function saveSession(session: Session): Promise<void> {
  cache = session;
  await Keychain.setGenericPassword('session', JSON.stringify(session), {
    service: SERVICE,
  });
}

export async function clearSession(): Promise<void> {
  cache = null;
  try {
    await Keychain.resetGenericPassword({ service: SERVICE });
  } catch {
    // nothing to clear
  }
}
