import { z } from 'zod';

const MAX_CONTEXT_ENTRIES = 100;
const MAX_CONTEXT_VALUE_LENGTH = 1024;
const MAX_CONTEXT_KEY_LENGTH = 128;

type ContextValue =
  | string
  | number
  | boolean
  | null
  | ContextValue[]
  | { [key: string]: ContextValue };

// Mirrors the client's recursive LogContext/LogContextValue types
// (client/src/util/logger/logEvent.ts) so nested context objects survive
// validation instead of being rejected by the remote logging microservice.
const contextValueSchema: z.ZodType<ContextValue> = z.lazy(() =>
  z.union([
    z.string().max(MAX_CONTEXT_VALUE_LENGTH),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(contextValueSchema),
    z.record(z.string().max(MAX_CONTEXT_KEY_LENGTH), contextValueSchema),
  ]),
);

const contextSchema = z
  .record(z.string().max(MAX_CONTEXT_KEY_LENGTH), contextValueSchema)
  .refine(
    (context) => Object.keys(context).length <= MAX_CONTEXT_ENTRIES,
    `context may have at most ${MAX_CONTEXT_ENTRIES} entries`,
  );

export const logEventSchema = z
  .object({
    sessionId: z.string().uuid(),
    userHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, 'userHash must be a SHA-256 hex string'),
    timestamp: z.string().datetime({ offset: true }),
    event: z.string().min(1).max(64),
    page: z.string().min(1).max(1024),
    element: z.string().min(1).max(128),
    label: z.string().min(1).max(512),
    context: contextSchema.default({}),
  })
  .required();

export type LogEventDto = z.infer<typeof logEventSchema>;
