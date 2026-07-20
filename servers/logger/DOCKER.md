# Logger microservice container

The logger microservice Docker image exposes the NestJS logger ingestion API
on port `4003` by default.

## Runtime variables

- `LOGGER_CONFIG_PATH`
- `LOGGER_HOSTNAME`
- `LOGGER_PORT`
- `LOGGER_CORS_ALLOW_ORIGIN`
- `LOGGER_AUTH_TOKEN`
- `LOGGER_JWT` (deprecated alias for `LOGGER_AUTH_TOKEN`)
- `LOGGER_TLS`
- `LOGGER_CERTS_DIR`
- `LOGGER_LOG_FILE_PATH`
- `LOGGER_MAX_PAYLOAD_BYTES`
- `LOGGER_LOG_MAX_BYTES`
- `LOGGER_LOG_RETENTION_FILES`

Mount a host directory to `/dtaas/logger/logs` to persist captured events. Use a
dedicated path such as `./files/logs`, not the shared workspace/library path.

When `LOGGER_TLS=true`, also mount a cert directory to
`/dtaas/logger/certs` (or another directory pointed to by
`LOGGER_CERTS_DIR`). Missing cert/key files are generated automatically.
