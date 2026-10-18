import { storeJson, type StoreConfig } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'

export const apiPort = 3000
export const webPort = 8080
export const valkeyPort = 6379

export const serverDir = '/opt/server/packages/home-server'

// Yarn PnP: requiring .pnp.cjs lets plain node resolve the workspace, so the
// daemon's signals reach the server rather than a `yarn node` wrapper.
export const serverCommand: [string, ...string[]] = [
  'node',
  '--require',
  '/opt/server/.pnp.cjs',
  'dist/bin/server.js',
]

export const serverEnv = (store: StoreConfig, filesServerUrl: string) => ({
  NODE_ENV: 'production',
  PORT: `${apiPort}`,
  REDIS_URL: `redis://127.0.0.1:${valkeyPort}`,
  // Host-only cookies; upstream's default domain (standardnotes.com) never matches.
  COOKIE_DOMAIN: '',
  JWT_SECRET: store.jwtSecret,
  AUTH_JWT_SECRET: store.authJwtSecret,
  ENCRYPTION_SERVER_KEY: store.encryptionServerKey,
  PSEUDO_KEY_PARAMS_KEY: store.pseudoKeyParamsKey,
  VALET_TOKEN_SECRET: store.valetTokenSecret,
  ADMIN_KEY: store.adminKey,
  FILES_SERVER_URL: filesServerUrl,
  DISABLE_USER_REGISTRATION: `${!store.signupsAllowed}`,
})

export const primaryUrl = sdk.setupPrimaryUrl({
  id: 'set-primary-url',
  hostId: 'api-multi',
  interfaceId: 'api',
  metadata: {
    name: i18n('Set Files URL'),
    description: i18n(
      'Choose the address the Standard Notes apps upload and download files through. Pick one every device you use can reach. The server restarts to apply the change.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  field: { name: i18n('URL'), description: null },
  get: storeJson.read((s) => s.filesServerUrl),
  set: (effects, url) => storeJson.merge(effects, { filesServerUrl: url }),
})
