import { factories } from '@strapi/strapi';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 120;
const SUBJECT_MAX_LENGTH = 160;
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 5_000;

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function normalizeMultilineText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .trim()
    : '';
}

export default factories.createCoreController(
  'api::contact-submission.contact-submission',
  ({ strapi }) => ({
    async create(ctx) {
      const body = ctx.request.body as { data?: Record<string, unknown> } | undefined;
      const input = body?.data ?? {};

      const name = normalizeText(input.name);
      const email = normalizeText(input.email).toLowerCase();
      const subject = normalizeText(input.subject);
      const message = normalizeMultilineText(input.message);

      if (!name || name.length > NAME_MAX_LENGTH) {
        return ctx.badRequest(`Name is required and must be ${NAME_MAX_LENGTH} characters or fewer.`);
      }
      if (!email || email.length > 320 || !EMAIL_REGEX.test(email)) {
        return ctx.badRequest('A valid email is required.');
      }
      if (subject.length > SUBJECT_MAX_LENGTH) {
        return ctx.badRequest(`Subject must be ${SUBJECT_MAX_LENGTH} characters or fewer.`);
      }
      if (!message || message.length < MESSAGE_MIN_LENGTH || message.length > MESSAGE_MAX_LENGTH) {
        return ctx.badRequest(
          `Message length must be between ${MESSAGE_MIN_LENGTH} and ${MESSAGE_MAX_LENGTH} characters.`
        );
      }

      const created = await strapi.entityService.create(
        'api::contact-submission.contact-submission',
        {
          data: {
            name,
            email,
            subject: subject || undefined,
            message,
          },
        }
      );

      const sanitized = await this.sanitizeOutput(created, ctx);
      return this.transformResponse(sanitized);
    },
  })
);
