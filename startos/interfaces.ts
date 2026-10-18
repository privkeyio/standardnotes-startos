import { sdk } from './sdk'
import { i18n } from './i18n'
import { apiPort, webPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const apiMulti = sdk.MultiHost.of(effects, 'api-multi')
  const apiMultiOrigin = await apiMulti.bindPort(apiPort, {
    protocol: 'http',
  })
  const api = sdk.createInterface(effects, {
    name: i18n('Server API'),
    id: 'api',
    description: i18n(
      'The Standard Notes sync API. Point your Standard Notes app at this address to sync your encrypted notes.',
    ),
    type: 'api',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })

  const apiReceipt = await apiMultiOrigin.export([api])

  const webOrigin = await apiMulti.bindPort(webPort, { protocol: 'http' })
  const web = sdk.createInterface(effects, {
    name: i18n('Web App'),
    id: 'web',
    description: i18n(
      'The Standard Notes web app, connected to this server. Open it in a browser to read and write your notes.',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
  })
  const webReceipt = await webOrigin.export([web])

  return [apiReceipt, webReceipt]
})
