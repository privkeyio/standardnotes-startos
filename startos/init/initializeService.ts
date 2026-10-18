import { utils } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

export const initializeService = sdk.setupOnInit(async (effects, kind) => {
  await storeJson.merge(effects, {})

  const secret = () => utils.getDefaultString({ charset: 'a-f,0-9', len: 64 })

  if (!(await storeJson.read((s) => s.adminKey).once())) {
    await storeJson.merge(effects, { adminKey: secret() })
  }

  if (kind !== 'install') return

  await storeJson.merge(effects, {
    jwtSecret: secret(),
    authJwtSecret: secret(),
    encryptionServerKey: secret(),
    pseudoKeyParamsKey: secret(),
    valetTokenSecret: secret(),
  })
})
