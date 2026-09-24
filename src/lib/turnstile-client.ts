import { TURNSTILE_SITE_KEY } from "./config";

interface TurnstileApi {
    render(container: HTMLElement, options: Record<string, unknown>): string;
    reset(widgetId: string): void;
    remove(widgetId: string): void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoading: Promise<TurnstileApi> | null = null;

/** Loads Turnstile once. A failed load is forgotten, so the next attempt tries again. */
function loadScript(): Promise<TurnstileApi> {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    scriptLoading ??= new Promise<TurnstileApi>((resolve, reject) => {
        const script = document.createElement("script");
        const fail = (message: string) => {
            scriptLoading = null;
            script.remove();
            reject(new Error(message));
        };
        script.src = SCRIPT_SRC;
        script.async = true;
        script.onload = () => (window.turnstile ? resolve(window.turnstile) : fail("Turnstile did not load"));
        script.onerror = () => fail("Turnstile was blocked");
        document.head.appendChild(script);
    });
    return scriptLoading;
}

interface Waiter {
    resolve(token: string): void;
    reject(error: Error): void;
}

/**
 * One widget per form. The script loads when the visitor starts filling the form. Each token is
 * used once: call reset() after a failed submission, and remove() when the form is gone.
 */
export function createTurnstile(container: HTMLElement) {
    let widgetId: string | null = null;
    let rendering: Promise<void> | null = null;
    let latest: string | null = null;
    let interactive = false;
    let waiters: Waiter[] = [];

    function settle(outcome: { token: string } | { error: Error }) {
        const current = waiters;
        waiters = [];
        if ("token" in outcome) {
            if (current.length === 0) latest = outcome.token;
            current.forEach(waiter => waiter.resolve(outcome.token));
        } else {
            current.forEach(waiter => waiter.reject(outcome.error));
        }
    }

    function prime(): Promise<void> {
        rendering ??= loadScript()
            .then(api => {
                widgetId = api.render(container, {
                    "sitekey": TURNSTILE_SITE_KEY,
                    "theme": "dark",
                    "size": "flexible",
                    "appearance": "interaction-only",
                    "callback": (token: string) => {
                        interactive = false;
                        settle({ token });
                    },
                    "error-callback": () => {
                        interactive = false;
                        settle({ error: new Error("Turnstile reported an error") });
                    },
                    "expired-callback": () => {
                        latest = null;
                    },
                    "before-interactive-callback": () => {
                        interactive = true;
                    },
                    "after-interactive-callback": () => {
                        interactive = false;
                    }
                });
            })
            .catch((error: unknown) => {
                rendering = null;
                throw error;
            });
        return rendering;
    }

    async function token(timeoutMs = 15_000): Promise<string> {
        await prime();
        if (latest) {
            const ready = latest;
            latest = null;
            return ready;
        }
        return new Promise<string>((resolve, reject) => {
            let timer: ReturnType<typeof setTimeout>;
            const waiter: Waiter = {
                resolve: value => {
                    clearTimeout(timer);
                    resolve(value);
                },
                reject: error => {
                    clearTimeout(timer);
                    reject(error);
                }
            };
            // An interactive check takes as long as the visitor needs; only an idle widget times out.
            const expire = () => {
                if (interactive) {
                    timer = setTimeout(expire, timeoutMs);
                    return;
                }
                waiters = waiters.filter(other => other !== waiter);
                reject(new Error("Turnstile timed out"));
            };
            timer = setTimeout(expire, timeoutMs);
            waiters.push(waiter);
        });
    }

    function reset() {
        latest = null;
        interactive = false;
        if (widgetId !== null) window.turnstile?.reset(widgetId);
    }

    function remove() {
        if (widgetId !== null) window.turnstile?.remove(widgetId);
        widgetId = null;
        rendering = null;
        latest = null;
        interactive = false;
        settle({ error: new Error("Turnstile was removed") });
    }

    return { prime, token, reset, remove };
}
