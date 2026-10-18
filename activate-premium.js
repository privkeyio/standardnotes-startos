// Runs upstream's ActivatePremiumFeatures against the stopped server's database.
require('reflect-metadata')
const { Service: AuthService } = require('@standardnotes/auth-server')
const {
  ControllerContainer,
  ServiceContainer,
} = require('@standardnotes/domain-core')
const {
  DirectCallDomainEventPublisher,
} = require('@standardnotes/domain-events-infra')
const winston = require('winston')

const main = async () => {
  const auth = new AuthService(
    new ServiceContainer(),
    new ControllerContainer(),
    new DirectCallDomainEventPublisher(),
  )
  await auth.getContainer({
    logger: winston.createLogger({
      level: 'warn',
      transports: [new winston.transports.Console()],
    }),
    environmentOverrides: {
      DB_TYPE: 'sqlite',
      CACHE_TYPE: 'memory',
      DB_SQLITE_DATABASE_PATH: '/data/database/home_server.sqlite',
      FILE_UPLOAD_PATH: '/data/uploads',
      MODE: 'home-server',
    },
  })
  const result = await auth.activatePremiumFeatures({
    username: process.argv[2],
    subscriptionId: 1,
    endsAt: new Date('2100-01-01T00:00:00Z'),
    cancelPreviousSubscription: true,
  })
  if (result.isFailed()) {
    console.error(result.getError())
    process.exit(1)
  }
  console.log(result.getValue())
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
