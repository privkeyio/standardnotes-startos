export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Standard Notes Server': 0,
  'Server API': 1,
  'The Standard Notes Server is ready': 2,
  'The Standard Notes Server is not responding': 3,

  // interfaces.ts
  'The Standard Notes sync API. Point your Standard Notes app at this address to sync your encrypted notes.': 4,

  // actions/toggleSignups.ts, init/taskToggleSignups.ts
  'Disable Signups': 5,
  'Enable Signups': 6,
  'Signups are currently enabled. Run this action to prohibit new accounts.': 7,
  'Signups are currently disabled. Run this action to permit new accounts.': 8,
  'New accounts can no longer be created. Existing accounts are unaffected.': 9,
  'Anyone who can reach your Server API address will be able to create an account on your server.': 10,
  'After creating your accounts, disable signups. Until then, anyone who can reach your Server API address can create an account on your server.': 11,

  // primaryUrl.ts, init/index.ts
  'Set Files URL': 12,
  'Choose the address the Standard Notes apps upload and download files through. Pick one every device you use can reach. The server restarts to apply the change.': 13,
  URL: 14,
  'Choose the address the Standard Notes apps use for file uploads.': 15,

  // actions/activatePremium.ts
  'Account Email': 16,
  'The email address of the account to upgrade.': 17,
  'Activate Premium': 18,
  'Grant an account on this server a Standard Notes premium subscription.': 19,
  'Premium Activated': 20,

  // main.ts signups health check
  Signups: 21,
  'Signups are open. Anyone who can reach the Server API address can create an account. Run Disable Signups once your accounts exist.': 22,
  'Signups are disabled': 23,

  // interfaces.ts / main.ts web app
  'Web App': 24,
  'The Standard Notes web app, connected to this server. Open it in a browser to read and write your notes.': 25,
  'The web app is ready': 26,
  'The web app is not responding': 27,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
