import { sdk } from '../sdk'
import { dependencies } from '../dependencies'
import { setInterfaces } from '../interfaces'
import { versionGraph } from '../versions'
import { actions } from '../actions'
import { restoreInit } from '../backups'
import { primaryUrl } from '../utils'
import { i18n } from '../i18n'
import { initializeService } from './initializeService'
import { taskToggleSignups } from './taskToggleSignups'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  setInterfaces,
  actions,
  primaryUrl.setupTask('important', {
    reason: i18n(
      'Choose the address the Standard Notes apps use for file uploads.',
    ),
  }),
  dependencies,
  initializeService,
  taskToggleSignups,
)

export const uninit = sdk.setupUninit(versionGraph)
