import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'standardnotes-server',
  title: 'Standard Notes Server',
  license: 'AGPL-3.0-or-later',
  packageRepo: 'https://github.com/Start9-Community/standardnotes-startos',
  upstreamRepo: 'https://github.com/standardnotes/server',
  marketingUrl: 'https://standardnotes.com',
  donationUrl: null,
  description: { short, long },
  volumes: ['main'],
  images: {
    // Built from the `server` submodule by the Dockerfile; upstream publishes
    // no image of the home server.
    'standardnotes-server': {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
    valkey: {
      source: { dockerTag: 'valkey/valkey:9.0.6-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
    web: {
      source: { dockerBuild: { dockerfile: './web/Dockerfile' } },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
