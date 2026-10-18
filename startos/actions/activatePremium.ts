import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { serverDir, serverEnv } from '../utils'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  email: Value.text({
    name: i18n('Account Email'),
    description: i18n('The email address of the account to upgrade.'),
    required: true,
    default: null,
    inputmode: 'email',
  }),
})

export const activatePremium = sdk.Action.withInput(
  'activate-premium',

  async ({ effects }) => ({
    name: i18n('Activate Premium'),
    description: i18n(
      'Grant an account on this server a Standard Notes premium subscription.',
    ),
    warning: null,
    allowedStatuses: 'only-stopped',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async () => null,

  async ({ effects, input }) => {
    const store = await storeJson.read().once()
    if (!store) throw new Error('no store.json')

    const res = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'standardnotes-server' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: '/data',
        readonly: false,
      }),
      'activate-premium',
      (sub) =>
        sub.exec(
          [
            'node',
            '--require',
            '/opt/server/.pnp.cjs',
            'activate-premium.js',
            input.email.trim(),
          ],
          { cwd: serverDir, env: serverEnv(store, '') },
        ),
    )
    if (res.exitCode !== 0) {
      throw new Error(String(res.stderr).trim())
    }

    return {
      version: '1',
      title: i18n('Premium Activated'),
      message: `${input.email.trim()}: ${String(res.stdout).trim()}`,
      result: null,
    }
  },
)
