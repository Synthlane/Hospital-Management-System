FROM node:20-slim

ENV NODE_ENV=production

WORKDIR /usr/src/medivyx

# Add the built server bundle
ADD ./medplum-server.tar.gz ./

RUN npm ci && \
    groupadd -r medivyx && \
    useradd -r -g medivyx medivyx && \
    chown -R medivyx:medivyx /usr/src/medivyx

USER medivyx

EXPOSE 8103

ENTRYPOINT [
  "node",
  "--require",
  "./packages/server/dist/otel/instrumentation.js",
  "packages/server/dist/index.js"
]
