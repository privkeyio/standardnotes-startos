import { sdk } from '../sdk'
import { primaryUrl } from '../utils'
import { activatePremium } from './activatePremium'
import { toggleSignups } from './toggleSignups'

export const actions = sdk.Actions.of()
  .addAction(toggleSignups)
  .addAction(primaryUrl.action)
  .addAction(activatePremium)
