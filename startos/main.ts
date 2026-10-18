import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { primaryUrl } from './utils'
import { sdk } from './sdk'
import {
  serverCommand,
  serverDir,
  serverEnv,
  apiPort,
  valkeyPort,
  webPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Standard Notes Server'))

  const store = await storeJson.read().const(effects)
  if (!store) throw new Error('no store.json')

  const filesServerUrl = (await primaryUrl.bestUsable(effects).const()) ?? ''

  const valkeySub = sdk.SubContainer.of(
    effects,
    { imageId: 'valkey' },
    null,
    'valkey',
  )

  return sdk.Daemons.of(effects)
    .addDaemon('valkey', {
      subcontainer: valkeySub,
      exec: {
        command: [
          'valkey-server',
          '--bind',
          '127.0.0.1',
          '--port',
          `${valkeyPort}`,
          '--save',
          '',
          '--appendonly',
          'no',
        ],
      },
      ready: {
        display: null,
        fn: async () => {
          const res = await valkeySub.exec(['valkey-cli', 'ping'])
          return res.stdout.toString().trim() === 'PONG'
            ? { message: '', result: 'success' }
            : { message: res.stdout.toString().trim(), result: 'failure' }
        },
      },
      requires: [],
    })
    .addDaemon('primary', {
      subcontainer: sdk.SubContainer.of(
        effects,
        { imageId: 'standardnotes-server' },
        sdk.Mounts.of().mountVolume({
          volumeId: 'main',
          subpath: null,
          mountpoint: '/data',
          readonly: false,
        }),
        'standardnotes-server',
      ),
      exec: {
        command: serverCommand,
        cwd: serverDir,
        env: serverEnv(store, filesServerUrl),
        // Upstream's SIGTERM handler closes the HTTP server but never exits.
        sigtermTimeout: 10_000,
      },
      ready: {
        display: i18n('Server API'),
        // Upstream migrations run before the server listens.
        gracePeriod: 60_000,
        trigger: sdk.trigger.statusTrigger(30_000, {
          starting: 5_000,
          waiting: 5_000,
          failure: 5_000,
        }),
        fn: () =>
          sdk.healthCheck.checkWebUrl(
            effects,
            `http://127.0.0.1:${apiPort}/healthcheck`,
            {
              successMessage: i18n('The Standard Notes Server is ready'),
              errorMessage: i18n('The Standard Notes Server is not responding'),
            },
          ),
      },
      requires: ['valkey'],
    })
    .addDaemon('web', {
      subcontainer: sdk.SubContainer.of(
        effects,
        { imageId: 'web' },
        null,
        'web',
      ),
      exec: { command: ['nginx', '-g', 'daemon off;'] },
      ready: {
        display: i18n('Web App'),
        fn: () =>
          sdk.healthCheck.checkPortListening(effects, webPort, {
            successMessage: i18n('The web app is ready'),
            errorMessage: i18n('The web app is not responding'),
          }),
      },
      requires: ['primary'],
    })
    .addHealthCheck('signups', {
      ready: {
        display: i18n('Signups'),
        // The result only changes when main restarts, so check once.
        gracePeriod: 0,
        trigger: async function* () {
          yield
        },
        fn: () =>
          store.signupsAllowed
            ? {
                result: 'failure',
                message: i18n(
                  'Signups are open. Anyone who can reach the Server API address can create an account. Run Disable Signups once your accounts exist.',
                ),
              }
            : { result: 'success', message: i18n('Signups are disabled') },
      },
      requires: ['primary'],
    })
})
