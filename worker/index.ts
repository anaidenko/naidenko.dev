import { handleContact } from './contact';
import { verifyTurnstile } from './turnstile';

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contact') {
      return handleContact(request, {
        verifyTurnstile: (token, remoteIp) => verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, remoteIp),
        sendEmail: (message) => env.EMAIL.send(message),
        to: env.CONTACT_TO,
        from: env.CONTACT_FROM,
      });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
