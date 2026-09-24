// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Options = Record<string, unknown> & {
    "callback": (token: string) => void;
    "error-callback": () => void;
    "before-interactive-callback": () => void;
};

function fakeApi() {
    const widgets: Options[] = [];
    return {
        widgets,
        render: vi.fn((_container: HTMLElement, options: Options) => {
            widgets.push(options);
            return `widget-${widgets.length}`;
        }),
        reset: vi.fn(),
        remove: vi.fn()
    };
}

async function load() {
    vi.resetModules();
    return import("./turnstile-client");
}

beforeEach(() => {
    delete window.turnstile;
    document.head.innerHTML = "";
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("createTurnstile", () => {
    it("renders again after a failed render instead of failing every later submit", async () => {
        const api = fakeApi();
        api.render.mockImplementationOnce(() => {
            throw new Error("bad container");
        });
        window.turnstile = api;
        const { createTurnstile } = await load();
        const session = createTurnstile(document.createElement("div"));
        await expect(session.prime()).rejects.toThrow("bad container");
        await expect(session.prime()).resolves.toBeUndefined();
        expect(api.render).toHaveBeenCalledTimes(2);
    });

    it("loads the script again when it loaded without defining turnstile", async () => {
        const appended: HTMLScriptElement[] = [];
        vi.spyOn(document.head, "appendChild").mockImplementation(node => {
            appended.push(node as HTMLScriptElement);
            return node;
        });
        const { createTurnstile } = await load();
        const session = createTurnstile(document.createElement("div"));
        const first = session.prime();
        appended[0].onload?.(new Event("load"));
        await expect(first).rejects.toThrow();
        void session.prime().catch(() => undefined);
        expect(appended).toHaveLength(2);
    });

    it("rejects a waiting token as soon as the widget reports an error", async () => {
        vi.useFakeTimers();
        const api = fakeApi();
        window.turnstile = api;
        const { createTurnstile } = await load();
        const session = createTurnstile(document.createElement("div"));
        const pending = session.token(15_000);
        await vi.advanceTimersByTimeAsync(0);
        api.widgets[0]["error-callback"]();
        await expect(pending).rejects.toThrow();
    });

    it("waits past the timeout while the visitor solves an interactive check", async () => {
        vi.useFakeTimers();
        const api = fakeApi();
        window.turnstile = api;
        const { createTurnstile } = await load();
        const session = createTurnstile(document.createElement("div"));
        const pending = session.token(15_000);
        const settled = vi.fn();
        pending.then(settled, settled);
        await vi.advanceTimersByTimeAsync(0);
        api.widgets[0]["before-interactive-callback"]();
        await vi.advanceTimersByTimeAsync(40_000);
        expect(settled).not.toHaveBeenCalled();
        api.widgets[0].callback("solved-token");
        await expect(pending).resolves.toBe("solved-token");
    });

    it("removes the widget when the form is done with it", async () => {
        const api = fakeApi();
        window.turnstile = api;
        const { createTurnstile } = await load();
        const session = createTurnstile(document.createElement("div"));
        await session.prime();
        session.remove();
        expect(api.remove).toHaveBeenCalledWith("widget-1");
    });
});
