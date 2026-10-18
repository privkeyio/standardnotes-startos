FROM node:20.19-alpine

RUN apk add --no-cache g++ make python3 openssl bash

WORKDIR /opt/server

COPY server/ ./

RUN corepack enable && \
    yarn install --immutable && \
    CI=true yarn build

# The home server keeps its data at ${__dirname}/../data of dist/bin/server.js.
RUN rm -rf packages/home-server/dist/data && ln -s /data packages/home-server/dist/data

COPY activate-premium.js packages/home-server/
