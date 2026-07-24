import { z } from 'zod';

const MAX_CONTEXT_ENTRIES = 100;
const MAX_CONTEXT_DEPTH = 6;
const MAX_CONTEXT_VALUE_LENGTH = 1024;
const MAX_CONTEXT_KEY_LENGTH = 128;

export const logEventTypeSchema = z.enum([
  'click',
  'change',
  'navigation',
  'notification',
  'dismiss',
]);

type ContextValue =
  | string
  | number
  | boolean
  | null
  | ContextValue[]
  | { [key: string]: ContextValue };

type ContextObject = { [key: string]: ContextValue };

type ContextFrame = {
  value: unknown;
  depth: number;
  path: Array<string | number>;
};

function isContextObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPrimitiveContextValue(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  );
}

function addContextIssue(
  ctx: z.RefinementCtx,
  message: string,
  path: Array<string | number>,
): void {
  ctx.addIssue({ code: 'custom', message, path });
}

function validatePrimitive(
  value: unknown,
  ctx: z.RefinementCtx,
  path: Array<string | number>,
): void {
  if (typeof value === 'string' && value.length > MAX_CONTEXT_VALUE_LENGTH) {
    addContextIssue(
      ctx,
      `context string may have at most ${MAX_CONTEXT_VALUE_LENGTH} characters`,
      path,
    );
  }
  if (!isPrimitiveContextValue(value)) {
    addContextIssue(
      ctx,
      'context values must be primitives, arrays, or objects',
      path,
    );
  }
}

function childEntries(frame: ContextFrame): Array<[string | number, unknown]> {
  if (Array.isArray(frame.value)) return [...frame.value.entries()];
  if (isContextObject(frame.value)) return Object.entries(frame.value);
  return [];
}

function validateContextStructure(
  context: ContextObject,
  ctx: z.RefinementCtx,
): void {
  const stack: ContextFrame[] = [
    { value: context, depth: MAX_CONTEXT_DEPTH, path: [] },
  ];
  let entriesSeen = 0;
  while (stack.length > 0) {
    const frame = stack.pop() as ContextFrame;
    for (const [key, value] of childEntries(frame)) {
      entriesSeen += 1;
      const path = [...frame.path, key];
      const childDepth = frame.depth - 1;
      validateContextEntry(key, value, childDepth, entriesSeen, ctx, path);
      if (Array.isArray(value) || isContextObject(value)) {
        stack.push({ value, depth: childDepth, path });
      }
    }
  }
}

function validateContextEntry(
  key: string | number,
  value: unknown,
  depth: number,
  entriesSeen: number,
  ctx: z.RefinementCtx,
  path: Array<string | number>,
): void {
  validateContextKey(key, ctx, path);
  validateContextBudget(entriesSeen, ctx, path);
  if (rejectsContextDepth(value, depth, ctx, path)) return;
  if (!Array.isArray(value) && !isContextObject(value)) {
    validatePrimitive(value, ctx, path);
  }
}

function validateContextKey(
  key: string | number,
  ctx: z.RefinementCtx,
  path: Array<string | number>,
): void {
  if (typeof key !== 'string' || key.length <= MAX_CONTEXT_KEY_LENGTH) return;
  addContextIssue(
    ctx,
    `context keys may have at most ${MAX_CONTEXT_KEY_LENGTH} characters`,
    path,
  );
}

function validateContextBudget(
  entriesSeen: number,
  ctx: z.RefinementCtx,
  path: Array<string | number>,
): void {
  if (entriesSeen <= MAX_CONTEXT_ENTRIES) return;
  addContextIssue(
    ctx,
    `context may have at most ${MAX_CONTEXT_ENTRIES} entries`,
    path,
  );
}

function rejectsContextDepth(
  value: unknown,
  depth: number,
  ctx: z.RefinementCtx,
  path: Array<string | number>,
): boolean {
  if (!Array.isArray(value) && !isContextObject(value)) return false;
  if (depth > 0) return false;
  addContextIssue(
    ctx,
    `context may have at most ${MAX_CONTEXT_DEPTH} levels`,
    path,
  );
  return true;
}

const contextSchema = z
  .custom<ContextObject>(isContextObject, 'context must be an object')
  .superRefine(validateContextStructure);

const pageTransitionSchema = z.object({
  src: z.string().min(1).max(1024),
  target: z.string().min(1).max(1024),
});

export const logEventSchema = z.object({
  sessionId: z.string().uuid(),
  userHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, 'userHash must be a SHA-256 hex string'),
  timestamp: z.string().datetime({ offset: true }),
  event: logEventTypeSchema,
  page: z.string().min(1).max(1024),
  page_transition: pageTransitionSchema.optional(),
  element: z.string().min(1).max(128),
  label: z.string().min(1).max(512),
  context: contextSchema.default({}),
});

export type LogEventTypeDto = z.infer<typeof logEventTypeSchema>;
export type LogEventDto = z.infer<typeof logEventSchema>;
