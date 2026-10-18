import { toggleSignups } from '../actions/toggleSignups'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const taskToggleSignups = sdk.setupOnInit(async (effects, kind) => {
  if (kind === 'install') {
    await sdk.action.createOwnTask(effects, toggleSignups, 'important', {
      reason: i18n(
        'After creating your accounts, disable signups. Until then, anyone who can reach your Server API address can create an account on your server.',
      ),
    })
  }
})
