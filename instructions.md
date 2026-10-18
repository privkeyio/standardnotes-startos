# Standard Notes Server

## Documentation

- [Standard Notes Help](https://standardnotes.com/help/*) — the upstream help center: using the apps, custom sync servers, and self-hosting.

## What you get on StartOS

A private sync server for the Standard Notes apps, with the Standard Notes web app built in. Open the **Web App** interface in a browser, or point the desktop and mobile apps at the **Server API** address. Your encrypted notes, tags, uploaded files, and revision history are stored on your server.

## Getting set up

1. **Trust the certificate** on each device you connect from (see [Trusting the HTTPS certificate](#trusting-the-https-certificate) below). The LAN addresses are served over HTTPS with your server's own root CA, and an untrusted certificate is the most common cause of a "Failed to fetch" error.
2. **In a browser,** open the **Web App** interface. It already uses this server; no address needs entering.
3. **In the desktop or mobile app,** copy the **Server API** address from this service's page. In the app's sign-in screen, open the advanced options, choose a custom sync server, and enter that address.
4. **Register your accounts.** Create each account from the web app or an app. Your notes are encrypted on the device before they reach the server.
5. **Disable signups.** Run the **Disable Signups** task. Until you do, anyone who can reach the address can create an account on your server. The **Signups** health check stays failed while signups are open.
6. **Choose the files address** if you will upload files. Run **Set Files URL** and pick an address every device you use can reach.

Use this service's **Web App** rather than app.standardnotes.com: the hosted web app cannot connect to your server, because its browser security policy only allows Standard Notes' own servers.

## Trusting the HTTPS certificate

The Server API LAN address uses an HTTPS certificate signed by your StartOS server's own root CA. Clients reject this certificate until they trust that CA, which shows up as **"Failed to fetch"** when you try to sign in. Download your server's root CA from StartOS (**System → Root CA**, "Download Certificate") and install it on each device you connect from.

- **Most browsers / OSes:** install the CA into the system or browser trust store.
- **Chromium / Electron on Linux** (this includes the **Standard Notes desktop app**): Chromium does not use the system CA store on Linux — it uses the NSS database. Add the CA with `certutil` (from `libnss3-tools`):

  ```sh
  certutil -d sql:"$HOME/.pki/nssdb" -A -t "C,," -n "StartOS Root CA" -i /path/to/root-ca.crt
  ```

  Fully quit and reopen the app afterward (Electron reads the trust store at startup).

- **Standard Notes installed as a snap:** snaps are confined and cannot read `~/.pki/nssdb`. Import the CA into the snap's own NSS database instead:

  ```sh
  certutil -d sql:"$HOME/snap/standard-notes/current/.pki/nssdb" -A -t "C,," \
    -n "StartOS Root CA" -i /path/to/root-ca.crt
  ```

  Note that snaps store this per revision, so the trust must be re-imported after the snap updates to a new revision.

To verify the certificate and address before touching the app:

```sh
curl --cacert /path/to/root-ca.crt https://<server-api-address>/healthcheck
```

A response with no certificate error means the server and CA are trusted; only the app's trust store remains.

## Actions

- **Disable Signups / Enable Signups:** closes or reopens registration. Existing accounts are unaffected. Reopen it briefly to add an account, then close it again.
- **Set Files URL:** chooses the address the apps send file uploads to. Pick one every device can reach — a domain or Tor address for devices away from home, not the `.local` address.
- **Activate Premium:** grants an account a premium subscription (see [Premium features](#premium-features)). Stop the service first; the action is available only while it is stopped.

## Premium features

Standard Notes' premium features (the Super editor, extra themes, nested tags, larger uploads, etc.) are gated by a **subscription role** on your account. This package can grant that role at no cost, but a limitation imposed by the **Standard Notes apps** — not by this package — restricts where it takes effect.

### The first-party host limitation

The official Standard Notes apps only honor an online subscription when connected to one of their **first-party** sync hosts, which are hardcoded in the app:

- `api.standardnotes.com`
- `sync.standardnotes.org`
- `localhost:3123`

Any other sync server — including this self-hosted one at its StartOS address or your own domain, and this package's own **Web App** opened at those addresses — is treated as a **third-party host**, and the apps **ignore the online subscription for premium unlocking**. Your notes still sync perfectly; only the premium editors and themes stay locked. This is a client-side design decision and cannot be changed from the server.

Because `localhost:3123` is on that list, the workaround is to make this server reachable at `localhost:3123` on your computer (see [Unlocking premium in the Web App](#unlocking-premium-in-the-web-app) and [Unlocking premium in the desktop app](#unlocking-premium-in-the-desktop-app)).

### Granting the subscription

1. Create the account in a Standard Notes app first.
2. Stop the service, run **Activate Premium**, and enter the account's email.
3. Start the service again.

The grant lasts until the year 2100 and survives restarts, updates, and backups. Running it again for the same account replaces the earlier grant. By itself it unlocks nothing in the app until the app is connected through a first-party host.

### Unlocking premium in the Web App

Premium unlocks when the web app is loaded from `localhost:3123`, because it syncs with the address it is loaded from. On the computer you browse from, forward that port to the **Web App** interface's LAN address, using your server's root CA (see [Trusting the HTTPS certificate](#trusting-the-https-certificate)) to verify the connection:

```sh
socat TCP-LISTEN:3123,bind=127.0.0.1,reuseaddr,fork OPENSSL:<server-ip>:<web-app-port>,cafile=/path/to/root-ca.crt
```

`<server-ip>` and `<web-app-port>` come from the Web App's LAN address. Open `http://localhost:3123` in your browser, sign out fully, and sign back in. To keep the forward running, put the same command in a systemd user service as shown below.

If this computer also runs the desktop app's proxy below, use that proxy instead: both need port `3123`, and one proxy pointed at the Web App serves both.

### Unlocking premium in the desktop app

Premium unlocks only when the desktop app reaches the server at `https://localhost:3123`. StartOS does not answer TLS for the name `localhost`, and a public domain's certificate does not match it, so a plain passthrough fails either way. Instead, terminate TLS at a local proxy: present a self-signed `localhost` certificate to the app, and have `socat` open its own TLS connection to your server.

1. Generate a self-signed `localhost` certificate (once; reuse the files on every desktop):

   ```sh
   mkdir -p ~/.config/sn-tunnel && cd ~/.config/sn-tunnel
   openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
     -keyout localhost.key -out localhost.crt \
     -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
   cat localhost.crt localhost.key > localhost.pem
   ```

2. Trust `localhost.crt` in the app's trust store (snap NSS database shown; use `~/.pki/nssdb` for a non-snap install), then fully quit and reopen the app:

   ```sh
   certutil -d sql:"$HOME/snap/standard-notes/current/.pki/nssdb" -A -t "C,," \
     -n "Local localhost proxy" -i ~/.config/sn-tunnel/localhost.crt
   ```

3. Run the TLS-terminating proxy as a systemd user service. Its upstream is one of:
   - **The Web App's LAN address:** `OPENSSL:<server-ip>:<web-app-port>,cafile=/path/to/root-ca.crt`, verified against your server's root CA. The Web App also serves the server's API, so this one proxy serves the desktop app and, at `https://localhost:3123`, the web app in a browser that trusts `localhost.crt`. The LAN address can change; update the service if it does.
   - **A public domain** you added to the Web App or the Server API: `OPENSSL:<your-domain>:443`, verified against the domain's own certificate. A domain on the Web App serves both, as above.

   ```sh
   mkdir -p ~/.config/systemd/user
   cat > ~/.config/systemd/user/sn-tunnel.service <<'EOF'
   [Unit]
   Description=Standard Notes localhost:3123 TLS tunnel
   After=network-online.target
   Wants=network-online.target

   [Service]
   ExecStart=/usr/bin/socat OPENSSL-LISTEN:3123,reuseaddr,fork,cert=%h/.config/sn-tunnel/localhost.pem,verify=0 <upstream>
   Restart=always
   RestartSec=3

   [Install]
   WantedBy=default.target
   EOF
   systemctl --user daemon-reload
   systemctl --user enable --now sn-tunnel.service
   loginctl enable-linger "$USER"
   ```

4. Verify the proxy (validating against your own certificate):

   ```sh
   curl --cacert ~/.config/sn-tunnel/localhost.crt https://localhost:3123/healthcheck
   ```

   An `OK` response means the proxy presents your `localhost` certificate and reaches the server.

Then set the desktop app's custom sync server to `https://localhost:3123`, sign out fully, and sign back in — the premium editors unlock. Sessions are bound to the address, so a session created against another address (the LAN or public domain) will not carry the unlock; sign in fresh on `localhost:3123`.

> `systemctl --user enable --now` does **not** restart an already-running service. If you change the unit file, run `systemctl --user restart sn-tunnel.service`. With a snap install, re-run the `certutil` import after each snap revision update.

### Limitations

- **Mobile and other devices:** there is no `localhost` server on a phone, so the tunnel cannot work there. Premium on the official mobile apps against a self-hosted server is not achievable.
- **Custom public domains (direct connection):** pointing the app straight at a domain such as `notes.example.com` is still a third-party host, so premium stays locked; sync works. You can, however, use that domain as the upstream for the desktop app's `localhost:3123` proxy, which does unlock premium.
- **Offline activation does not work here:** the home server's offline-features endpoint cannot identify the user in single-process mode, and the apps only accept `localhost` as an offline features host, so this path is a dead end.
- The only way to get tunnel-free premium (including on mobile) is to run a **patched Standard Notes app** that adds your host to its first-party allowlist — a separate project outside this package.

## Listing accounts

The server has no admin page or API for listing accounts. To see who has registered, SSH into your StartOS server, open a shell in the service, and query its database (read-only, safe while the server is running):

```sh
sudo start-cli package attach standardnotes-server -n standardnotes-server
cd /opt/server/packages/auth && yarn node -e 'const s=require("sqlite3");const db=new s.Database("/data/database/home_server.sqlite",s.OPEN_READONLY);db.all("SELECT u.email, u.created_at, GROUP_CONCAT(r.name) AS roles FROM users u LEFT JOIN user_roles ur ON ur.user_uuid=u.uuid LEFT JOIN roles r ON r.uuid=ur.role_uuid GROUP BY u.uuid ORDER BY u.created_at",(e,rows)=>{if(e)throw e;console.table(rows)})'
exit
```

This prints each account's email, creation time (UTC), and roles. Every account has `CORE_USER`; accounts granted premium (see [Granting the subscription](#granting-the-subscription)) also have `PRO_USER`.

## Sessions and addresses

Session cookies issued by this server are host-only — they are bound to the exact address you connect to. If you reach the server at more than one address (for example the LAN address and a Tor or clearnet address), each address keeps its own session, so signing in on one will not carry over to another.

## Troubleshooting

- **"Failed to fetch" when signing in.** The client does not trust the server's certificate. Install the root CA on the device (see [Trusting the HTTPS certificate](#trusting-the-https-certificate)), and make sure you are using the HTTPS Server API address, not an `http://` one.
- **The app keeps asking for your password ("refresh your session").** This happens for a session created before the certificate/address was set up correctly; that session cannot be repaired. Sign out fully and sign back in to create a fresh session. Your notes are encrypted and remain safe on the server.
