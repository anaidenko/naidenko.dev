import { TURNSTILE_SITE_KEY } from "./config";

interface TurnstileApi {
    render(container: HTMLElement, options: Record<string, unknown>): string;
    reset(widgetId: string): void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoading: Promise<TurnstileApi> | null = null;

function loadScript(): Promise<TurnstileApi> {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    scriptLoading ??= new Promise<TurnstileApi>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not load")));
        script.onerror = () => {
            scriptLoading = null;
            script.remove();
            reject(new Error("Turnstile was blocked"));
        };
        document.head.appendChild(script);
    });
    return scriptLoading;
}

/**
 * One widget per form. The script loads only when the visitor starts filling the form, and each
 * token is used once: call reset() after every submission.
 */
export function createTurnstile(container: HTMLElement) {
    let widgetId: string | null = null;
    let rendering: Promise<void> | null = null;
    let latest: string | null = null;
    let waiters: Array<(token: string) => void> = [];

    function deliver(token: string) {
        const current = waiters;
        waiters = [];
        if (current.length === 0) latest = token;
        else current.forEach(resolve => resolve(token));
    }

    function prime(): Promise<void> {
        rendering ??= loadScript().then(
            api => {
                widgetId = api.render(container, {
                    "sitekey": TURNSTILE_SITE_KEY,
                    "theme": "dark",
                    "size": "flexible",
                    "appearance": "interaction-only",
                    "callback": deliver,
                    "expired-callback": () => {
                        latest = null;
                    }
                });
            },
            (error: unknown) => {
                rendering = null;
                throw error;
            }
        );
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
            const onToken = (value: string) => {
                clearTimeout(timer);
                resolve(value);
            };
            const timer = setTimeout(() => {
                waiters = waiters.filter(waiter => waiter !== onToken);
                reject(new Error("Turnstile timed out"));
            }, timeoutMs);
            waiters.push(onToken);
        });
    }

    function reset() {
        latest = null;
        if (widgetId !== null) window.turnstile?.reset(widgetId);
    }

    return { prime, token, reset };
}
