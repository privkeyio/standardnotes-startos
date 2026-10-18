import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const toggleSignups = sdk.Action.withoutInput(
  'toggle-signups',

  async ({ effects }) => {
    const allowed = await storeJson.read((s) => s.signupsAllowed).const(effects)

    return {
      name: allowed ? i18n('Disable Signups') : i18n('Enable Signups'),
      description: allowed
        ? i18n(
            'Signups are currently enabled. Run this action to prohibit new accounts.',
          )
        : i18n(
            'Signups are currently disabled. Run this action to permit new accounts.',
          ),
      warning: allowed
        ? i18n(
            'New accounts can no longer be created. Existing accounts are unaffected.',
          )
        : i18n(
            'Anyone who can reach your Server API address will be able to create an account on your server.',
          ),
      allowedStatuses: 'any',
      group: null,
      visibility: 'enabled',
    }
  },

  async ({ effects }) => {
    const allowed = await storeJson.read((s) => s.signupsAllowed).once()
    await storeJson.merge(effects, { signupsAllowed: !allowed })
  },
)
