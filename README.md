<p align="center">
  <img src="icon.png" alt="Standard Notes Server Logo" width="21%">
</p>

# Standard Notes Server on StartOS

> Everything not listed in this document should behave the same as upstream
> Standard Notes Server. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

This package runs the Standard Notes **home server**, the all-in-one self-host build of [standardnotes/server](https://github.com/standardnotes/server): one Node process that bundles the sync, auth, files, and revisions services on an embedded SQLite database and on-disk file storage. The Standard Notes desktop and mobile apps connect to it as a custom sync server, and the package serves upstream's web app alongside it.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Upstream publishes no image of the home server, so the package builds its own from source; Valkey runs beside it from the upstream image, and the web app is served by nginx from files taken out of upstream's web image.

| What          | Value                                                                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image source  | Custom `Dockerfile`: the `server` git submodule (upstream monorepo) built with Yarn on a Node Alpine base; `valkey/valkey` (Alpine); `web/Dockerfile`: nginx Alpine serving the static files of upstream's `standardnotes/web` image (pinned by digest) |
| Architectures | x86_64, aarch64                                                                                                                                                                                                                                         |
| Entrypoint    | `node --require /opt/server/.pnp.cjs dist/bin/server.js` in `packages/home-server`                                                                                                                                                                      |
| Subcontainers | `standardnotes-server` (daemon `primary`), `valkey` (daemon `valkey`), `web` (daemon `web`)                                                                                                                                                             |

Valkey listens on `127.0.0.1:6379` with persistence disabled; the files service needs it for short-lived valet tokens even in home-server mode. `primary` starts once Valkey answers `PING`. Upstream's `docker/docker-entrypoint.sh` is not used.

Upstream builds its web image for amd64 only, but its contents are architecture-independent static files, so `web/Dockerfile` copies them into a multi-arch nginx image. The image's `index.html` is edited at build time so the app's default sync server and files host are the origin it is loaded from, and its websocket URL is empty (the home server has no websocket service). nginx serves the app's files and proxies every other path to the server on `127.0.0.1:3000`, so the web app and the API share one origin.

## Volume and Data Layout

All state lives on one volume, `main`, mounted read-write at `/data` in `standardnotes-server`. Valkey has no volume.

| Path on `main`                | Contents                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `database/home_server.sqlite` | The SQLite database: accounts, encrypted items, sessions, subscriptions, revisions |
| `uploads/`                    | Uploaded file blobs (end-to-end encrypted)                                         |
| `start9/store.json`           | The package's own settings and generated secrets                                   |

The home server keeps its data under `packages/home-server/dist/data`, which the image symlinks to `/data`. No external MySQL or object storage is used, and Valkey holds nothing that must survive a restart.

## File Models

The package owns one file, `start9/store.json`. It writes no upstream configuration file and configures the server entirely through environment variables.

`store.json` holds:

- **Five server secrets**: `jwtSecret`, `authJwtSecret`, `encryptionServerKey`, `pseudoKeyParamsKey`, `valetTokenSecret`. Each is generated once at install (64 hex characters) and never rewritten. They sign sessions and encrypt server-side data, so editing or losing them invalidates every session and makes encrypted server data unreadable.
- **`adminKey`**: generated (64 hex characters) at the first init that finds it empty and never rewritten; passed as `ADMIN_KEY`. The home server mounts no `/admin` or `/internal` routes, so it guards nothing today; it is set so upstream does not warn and so those routes are closed if a release mounts them.
- **`filesServerUrl`**, written by **Set Files URL**. Empty means unset.
- **`signupsAllowed`** (default `true`), flipped by **Enable/Disable Signups**.

Every init merges the schema defaults into the file and keeps existing values. The daemon reads the file reactively, so any change, from an action or by hand, restarts the service with the new values, and a hand edit survives.

The daemon receives `NODE_ENV`, `PORT`, the five secrets, `ADMIN_KEY`, `REDIS_URL`, an empty `COOKIE_DOMAIN`, `FILES_SERVER_URL` and `DISABLE_USER_REGISTRATION` on every start. `FILES_SERVER_URL` is `filesServerUrl` while that address is still one of the **Server API** interface's addresses, and otherwise the interface's preferred address (a public domain, else the `.local` address).

## Dependencies

This service needs nothing from other services.

None.

## Network Access and Interfaces

The package exposes the server's HTTP API and the web app on two interfaces of one host, so both share every hostname; StartOS provides TLS for the LAN, Tor, and any domain the user adds.

| Interface id | Type  | Port | Protocol | Purpose                                                              |
| ------------ | ----- | ---- | -------- | -------------------------------------------------------------------- |
| `api`        | `api` | 3000 | HTTP     | Sync, auth, files, and revisions API used by the Standard Notes apps |
| `web`        | `ui`  | 8080 | HTTP     | Upstream's web app, plus the API proxied on the same origin          |

The web app signs in to the server it is served from with no server address to enter; the desktop and mobile apps use the **Server API** address. Session cookies are host-only (empty `COOKIE_DOMAIN`), so each address a client uses holds its own session.

## Installation and First-Run Flow

Setup needs no wizard and no credentials from the user; the secrets are generated at install.

On first start the home server creates its SQLite schema; on later starts it runs any new upstream migrations before it listens. Accounts are created from a Standard Notes app and are end-to-end encrypted, so the package cannot create one for the user, and the server has no admin account. Signups are open after install, and an `important` task asks the user to disable them once their accounts exist. Clients reject the LAN address until the device trusts the StartOS root CA, which is the most common first-run failure.

## Actions

The package has three user-facing actions.

**Disable Signups / Enable Signups** (`toggle-signups`)

- **When to run it:** after creating your accounts, to close registration; again to reopen it for a new account.
- **What it changes:** flips `signupsAllowed` in `store.json`, delivered as `DISABLE_USER_REGISTRATION`. Existing accounts and sessions are unaffected.
- **Cost:** restarts the service, which is unavailable for about 20 seconds.
- **Repeat safety:** each run toggles; the name shows which way it goes.

**Set Files URL** (`set-primary-url`)

- **When to run it:** before uploading files, to choose the address every client sends uploads to — one all your devices can reach.
- **What it changes:** `filesServerUrl` in `store.json`, delivered as `FILES_SERVER_URL`. Only the **Server API** interface's own addresses are offered.
- **Cost:** restarts the service.
- **Repeat safety:** safe to repeat.

**Activate Premium** (`activate-premium`)

- **When to run it:** to grant an existing account a Standard Notes premium subscription. Available only while the service is stopped.
- **What it changes:** runs `activate-premium.js` in a temporary container against the stopped server's SQLite database. The script boots upstream's auth service in-process and calls its `ActivatePremiumFeatures` use case (Pro plan, unlimited uploads, ending 2100, cancelling any earlier grant), with no HTTP listener.
- **Cost:** a few seconds.
- **Repeat safety:** safe to repeat; each run replaces the account's previous grant. Fails with upstream's message (`User not found with username: …`) for an unknown email.

## Tasks

The package raises up to two tasks, neither of which blocks the service.

| Task            | Raised when                                                                      | Severity    | Cleared by                                 |
| --------------- | -------------------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| Disable Signups | at install                                                                       | `important` | running **Disable Signups**                |
| Set Files URL   | while `filesServerUrl` is unset or is no longer one of the interface's addresses | `important` | choosing an address with **Set Files URL** |

## Health Checks

Three checks are displayed: **Server API**, the `primary` daemon's readiness check; **Web App**, the `web` daemon's; and **Signups**. Valkey's readiness (`valkey-cli ping`) is internal and not displayed.

### Server API

- **What it probes:** `GET http://127.0.0.1:3000/healthcheck`, every 5 seconds until it passes and every 30 seconds after.
- **Grace period:** 60 seconds. The server takes about 15 seconds to start, longer when upstream migrations run after an update; within the grace period the check reports starting rather than failed.
- **A failure that persists** means the Node process exited or never bound the port. The service log shows why; the usual causes are a failed database migration or a damaged `store.json`.

### Web App

- **What it probes:** that nginx is listening on port 8080. It starts after **Server API** passes.
- **A failure that persists** means nginx exited; the service log shows its error.

### Signups

- **What it reports:** whether registration is open, read from `signupsAllowed` in `store.json`.
- **A failure** means signups are open and anyone who can reach the Server API address can create an account. It is deliberate, not a fault: it fails from install until **Disable Signups** runs, and again whenever **Enable Signups** reopens registration. The server itself is unaffected.

## Backups and Restore

The `main` volume is backed up wholesale (`ofVolumes`): the SQLite database, uploaded files, and `store.json`, secrets included.

A restore brings back accounts, notes, files, subscriptions, and the secrets, so existing app sessions keep working. Nothing needs rebuilding; Valkey starts empty by design.

## Limitations and Differences

These are the ways the package differs from an upstream self-hosted deployment.

1. **Home server only.** The upstream multi-service deployment (MySQL, separate Redis, S3-compatible storage, separate files and revisions servers) is not available.
2. **The hosted web app cannot reach this server.** app.standardnotes.com's Content-Security-Policy `connect-src` allows only Standard Notes' own hosts; use the package's **Web App** interface instead.
3. **Premium is limited by the apps, not the server.** The official apps, and the built-in Web App, honor a subscription only on first-party hosts, `localhost:3123` among them. Premium therefore unlocks only through a local forward to `localhost:3123`: the Web App opened at `http://localhost:3123`, or the desktop app pointed at a TLS-terminating proxy there. Never on mobile. StartOS does not answer TLS for the name `localhost`, so a plain TCP passthrough to the server fails.
4. **Offline premium activation does not work** in home-server mode.
5. **The submodule may sit ahead of the release tag.** Upstream lands security fixes on `main` between `@standardnotes/home-server` releases, and the package builds the pinned commit while carrying the workspace's version.

## Quick Reference for AI Consumers

```yaml
package_id: standardnotes-server
images:
  standardnotes-server: built from Dockerfile (standardnotes/server submodule, home-server workspace)
  valkey: valkey/valkey (alpine)
architectures: [x86_64, aarch64]
subcontainers: [standardnotes-server, valkey, web]
daemons: [valkey, primary, web]
volumes:
  main: /data
file_models:
  - start9/store.json
startos_managed_env_vars:
  - NODE_ENV
  - PORT
  - JWT_SECRET
  - AUTH_JWT_SECRET
  - ENCRYPTION_SERVER_KEY
  - PSEUDO_KEY_PARAMS_KEY
  - VALET_TOKEN_SECRET
  - ADMIN_KEY
  - REDIS_URL
  - COOKIE_DOMAIN
  - FILES_SERVER_URL
  - DISABLE_USER_REGISTRATION
dependencies: none
interfaces:
  api: { type: api, port: 3000 }
  web: { type: ui, port: 8080 }
actions:
  - toggle-signups
  - set-primary-url
  - activate-premium
tasks:
  - toggle-signups (important, on install)
  - set-primary-url (important, while unset or stale)
health_checks:
  - primary # displayed "Server API"
  - web # displayed "Web App"
  - signups # fails while signups are open
```
