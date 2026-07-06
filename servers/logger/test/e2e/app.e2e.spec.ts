import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import supertest from 'supertest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import AppModule from 'src/app.module';

const VALID_PAYLOAD_FIXTURES = [
  'sample.json',
  'valid-1.json',
  'valid-2.json',
  'valid-3.json',
  'valid-4.json',
  'valid-5.json',
] as const;

const INVALID_PAYLOAD_FIXTURES = [
  'invalid-1.json',
  'invalid-2.json',
  'invalid-3.json',
  'invalid-4.json',
  'invalid-5.json',
] as const;

async function readPayloadFixture(
  fileName: (typeof VALID_PAYLOAD_FIXTURES)[number] | (typeof INVALID_PAYLOAD_FIXTURES)[number],
): Promise<Record<string, unknown>> {
  const fixturePath = path.resolve(process.cwd(), 'api', fileName);
  const payload = await readFile(fixturePath, 'utf8');
  return JSON.parse(payload) as Record<string, unknown>;
}

describe('Logger service e2e', () => {
  let app: INestApplication;
  let logFilePath = '';
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-e2e-'));
    logFilePath = path.join(tempDir, 'events.jsonl');
    process.env.LOGGER_CONFIG_PATH = '';
    process.env.LOGGER_TLS = 'false';
    process.env.LOGGER_CERTS_DIR = '';
    process.env.LOGGER_CORS_ALLOW_ORIGIN = '*';
    process.env.LOGGER_LOG_FILE_PATH = logFilePath;
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '65536';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors({
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.LOGGER_CONFIG_PATH;
    delete process.env.LOGGER_TLS;
    delete process.env.LOGGER_CERTS_DIR;
    delete process.env.LOGGER_CORS_ALLOW_ORIGIN;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('GET /logger/health returns ok', async () => {
    await supertest(app.getHttpServer())
      .get('/logger/health')
      .expect(HttpStatus.OK)
      .expect({ status: 'ok' });
  });

  it('POST /logger persists valid payload fixtures from api/', async () => {
    const sentPayloads: Array<Record<string, unknown>> = [];
    for (const fileName of VALID_PAYLOAD_FIXTURES) {
      const payload = await readPayloadFixture(fileName);
      sentPayloads.push(payload);
      await supertest(app.getHttpServer())
        .post('/logger')
        .send(payload)
        .set('Content-Type', 'application/json')
        .expect(HttpStatus.NO_CONTENT);
    }

    const content = await readFile(logFilePath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(VALID_PAYLOAD_FIXTURES.length);
    for (let index = 0; index < lines.length; index += 1) {
      expect(JSON.parse(lines[index])).toEqual(sentPayloads[index]);
    }
  });

  it('POST /logger rejects invalid payload fixtures from api/', async () => {
    for (const fileName of INVALID_PAYLOAD_FIXTURES) {
      const payload = await readPayloadFixture(fileName);
      const response = await supertest(app.getHttpServer())
        .post('/logger')
        .send(payload)
        .set('Content-Type', 'application/json');
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({
        message: 'Validation Failed',
        error: 'Bad Request',
        statusCode: 400,
      });
    }
  });

  it('OPTIONS /logger exposes CORS headers', async () => {
    const response = await supertest(app.getHttpServer())
      .options('/logger')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST');
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:3000',
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });
});

describe('Logger service e2e with jwt configured', () => {
  let app: INestApplication;
  let tempDir = '';

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'dtaas-logger-e2e-jwt-'));
    process.env.LOGGER_CONFIG_PATH = '';
    process.env.LOGGER_TLS = 'false';
    process.env.LOGGER_CERTS_DIR = '';
    process.env.LOGGER_CORS_ALLOW_ORIGIN = '*';
    process.env.LOGGER_LOG_FILE_PATH = path.join(tempDir, 'events.jsonl');
    process.env.LOGGER_MAX_PAYLOAD_BYTES = '65536';
    process.env.LOGGER_JWT = 'test-secret-token';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.LOGGER_CONFIG_PATH;
    delete process.env.LOGGER_TLS;
    delete process.env.LOGGER_CERTS_DIR;
    delete process.env.LOGGER_CORS_ALLOW_ORIGIN;
    delete process.env.LOGGER_LOG_FILE_PATH;
    delete process.env.LOGGER_MAX_PAYLOAD_BYTES;
    delete process.env.LOGGER_JWT;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('rejects POST /logger without a bearer token', async () => {
    const payload = await readPayloadFixture('sample.json');
    const response = await supertest(app.getHttpServer())
      .post('/logger')
      .send(payload)
      .set('Content-Type', 'application/json');
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('rejects POST /logger with the wrong bearer token', async () => {
    const payload = await readPayloadFixture('sample.json');
    const response = await supertest(app.getHttpServer())
      .post('/logger')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer wrong-token');
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('accepts POST /logger with the configured bearer token', async () => {
    const payload = await readPayloadFixture('sample.json');
    const response = await supertest(app.getHttpServer())
      .post('/logger')
      .send(payload)
      .set('Content-Type', 'application/json')
      .set('Authorization', 'Bearer test-secret-token');
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
  });

  it('GET /logger/health does not require a bearer token', async () => {
    await supertest(app.getHttpServer())
      .get('/logger/health')
      .expect(HttpStatus.OK);
  });
});
