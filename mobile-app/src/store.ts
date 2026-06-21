import { Preferences } from '@capacitor/preferences';
import type { User, Account } from './api/client';

class Store {
  private _user: User | null = null;
  private _accounts: Account[] = [];

  async load() {
    const { value: u } = await Preferences.get({ key: 'gb_user' });
    const { value: a } = await Preferences.get({ key: 'gb_accounts' });
    if (u) this._user = JSON.parse(u) ?? null;
    if (a) this._accounts = JSON.parse(a) ?? [];
  }

  get user(): User | null { return this._user; }
  get accounts(): Account[] { return this._accounts; }

  get primaryAccount(): Account | null {
    return this._accounts.find(a => a.status === 'active') ?? this._accounts[0] ?? null;
  }

  async setUser(user: User) {
    this._user = user;
    await Preferences.set({ key: 'gb_user', value: JSON.stringify(user) });
  }

  async setAccounts(accounts: Account[] | null | undefined) {
    this._accounts = accounts ?? [];
    await Preferences.set({ key: 'gb_accounts', value: JSON.stringify(this._accounts) });
  }

  async clear() {
    this._user = null;
    this._accounts = [];
    await Preferences.remove({ key: 'gb_user' });
    await Preferences.remove({ key: 'gb_accounts' });
    await Preferences.remove({ key: 'gb_token' });
    await Preferences.remove({ key: 'gb_refresh_token' });
  }
}

export const store = new Store();
