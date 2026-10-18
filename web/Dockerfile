# Upstream publishes the web app as an amd64-only image of static files; they run on any arch.
FROM --platform=linux/amd64 standardnotes/web:3705e5674d6934deccd2177739031bf3827811e6@sha256:de6f06a417f85bc30d6720a082d4342ebaf637567947b9bb7b50dc06956e2c9f AS web

FROM nginx:1.29.3-alpine

COPY --from=web /usr/share/nginx/html /usr/share/nginx/html

# Point the app at the origin it is served from; the home server has no websocket service.
RUN find /usr/share/nginx/html -name '*.map' -delete && \
    sed -i \
      -e 's|window.defaultSyncServer = "[^"]*"|window.defaultSyncServer = window.location.origin|' \
      -e 's|window.defaultFilesHost = "[^"]*"|window.defaultFilesHost = window.location.origin|' \
      -e 's|window.websocketUrl = "[^"]*"|window.websocketUrl = ""|' \
      /usr/share/nginx/html/index.html && \
    grep -q 'defaultSyncServer = window.location.origin' /usr/share/nginx/html/index.html && \
    grep -q 'websocketUrl = ""' /usr/share/nginx/html/index.html

COPY web/nginx.conf /etc/nginx/conf.d/default.conf
