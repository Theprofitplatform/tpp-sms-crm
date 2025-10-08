import { FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodError } from 'zod';

/**
 * Validation middleware factory
 * Creates a Fastify preHandler that validates request data against a Zod schema
 */
export function validateRequest<T extends z.ZodTypeAny>(schema: T, source: 'body' | 'query' | 'params' = 'body') {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const data = request[source];
      const validated = await schema.parseAsync(data);

      // Replace the request data with validated data
      // This ensures type safety and removes any extra fields
      (request as any)[source] = validated;
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Request validation failed',
          details: formattedErrors,
        });
      }

      // For non-Zod errors, return generic error
      request.log.error({ error }, 'Validation middleware error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred during validation',
      });
    }
  };
}

/**
 * Helper to validate body
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return validateRequest(schema, 'body');
}

/**
 * Helper to validate query parameters
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return validateRequest(schema, 'query');
}

/**
 * Helper to validate route parameters
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return validateRequest(schema, 'params');
}
