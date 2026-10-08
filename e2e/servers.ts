/** The test servers: naidenko.dev's build on E2E_PORT, the Toptal build on the next port. */
export const PORT = Number(process.env.E2E_PORT ?? 8788);
export const TOPTAL_PORT = Number(process.env.E2E_TOPTAL_PORT ?? PORT + 1);
export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const TOPTAL_URL = `http://127.0.0.1:${TOPTAL_PORT}`;
