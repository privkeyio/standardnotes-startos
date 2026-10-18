import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '1.23.8:1',
  releaseNotes: {
    en_US: 'The Signups health check runs once per start.',
    es_ES: 'La comprobación de estado Registros se ejecuta una vez por inicio.',
    de_DE: 'Die Statusprüfung Registrierungen läuft einmal pro Start.',
    pl_PL:
      'Kontrola stanu Rejestracje jest wykonywana raz przy każdym uruchomieniu.',
    fr_FR:
      "La vérification d'état Inscriptions s'exécute une fois par démarrage.",
  },
  migrations: {
    up: async () => {},
    down: IMPOSSIBLE,
  },
})
