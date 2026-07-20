# Logger Microservice Docker Image

The logger Docker image is published as `intocps/logger-ms`.

Deployment compose files pin the image tag, for example:

```yaml
image: intocps/logger-ms:0.1.0
```

The container should bind to all interfaces so Traefik can reach it:

```yaml
environment:
  - LOGGER_HOSTNAME=0.0.0.0
```

Expose it behind the `/logger` route. Client configurations should use the full
route prefix, such as `https://example.com/logger`.

For image details, see
[`servers/logger/DOCKER.md`](https://github.com/INTO-CPS-Association/DTaaS/blob/main/servers/logger/DOCKER.md).
