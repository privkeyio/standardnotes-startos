import { z, FileHelper } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const storeConfigSchema = z.looseObject({
  // Generated once at install; they sign sessions and encrypt server data.
  jwtSecret: z.string().catch(''),
  authJwtSecret: z.string().catch(''),
  encryptionServerKey: z.string().catch(''),
  pseudoKeyParamsKey: z.string().catch(''),
  valetTokenSecret: z.string().catch(''),
  adminKey: z.string().catch(''),
  filesServerUrl: z.string().catch(''),
  signupsAllowed: z.boolean().catch(true),
})

export type StoreConfig = z.infer<typeof storeConfigSchema>

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: 'start9/store.json' },
  storeConfigSchema,
)
