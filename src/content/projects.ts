export interface Project {
    name: string;
    /** Absent for client work whose code is private. */
    url?: string;
    note?: string;
    description: string;
    chips: readonly string[];
    image?: {
        src: string;
        alt: string;
        width: number;
        height: number;
        credit: { text: string; url: string };
    };
}

/**
 * The engineering system: condensed from the Toptal portfolio project of the same name (public page
 * saved 2026-09-16), names no client. The plugins: from their READMEs and GitHub descriptions, read
 * 2026-09-24; both are MIT.
 */
export const projects: readonly Project[] = [
    {
        name: "AI-native engineering system",
        note: "Client work · private code",
        description:
            "Lets AI coding agents carry a production mobile product safely, rather than just autocompleting code: planning, an independent plan review, implementation in isolated Git worktrees, code review, verification and release. The guardrails are deterministic, not advisory: hooks enforce what documentation alone cannot, each added after a specific failure happened once. Agents check the app on iOS and Android instead of trusting a green build.",
        chips: ["Claude Code", "AI agents", "MCP", "Playwright", "Node.js", "Bash"]
    },
    {
        name: "claude-video-digest",
        url: "https://github.com/anaidenko/claude-video-digest",
        description:
            "Turns any video into a readable digest: a timestamped contact sheet, individual frames, and a transcript grouped under the frame each line was spoken over. Claude can’t play video; this gives it something it can actually read. ffmpeg and local Whisper, no cloud, no API keys.",
        chips: ["Claude Code", "ffmpeg", "Whisper", "Shell"],
        image: {
            src: "/projects/claude-video-digest.jpg",
            alt: "A contact sheet: ten timestamped frames from a short animated film",
            width: 800,
            height: 449,
            credit: { text: "Frames: Big Buck Bunny © Blender Foundation, CC BY 3.0", url: "https://www.bigbuckbunny.org" }
        }
    },
    {
        name: "claude-notify-resume",
        url: "https://github.com/anaidenko/claude-notify-resume",
        description:
            "Desktop notifications for Claude Code that tell you which conversation replied, or is waiting on you, and take you back into it. macOS and Linux.",
        chips: ["Claude Code", "Shell", "macOS", "Linux"]
    }
];

export const installCommands: readonly string[] = [
    "claude plugin marketplace add anaidenko/claude-plugins",
    "claude plugin install claude-video-digest@anaidenko",
    "claude plugin install claude-notify-resume@anaidenko"
];

export const projectsIntro = "A system I built for client work, and two open-source tools for Claude Code, MIT-licensed.";

export const marketplace = {
    lead: "Install both from my plugin marketplace,",
    name: "claude-plugins",
    url: "https://github.com/anaidenko/claude-plugins"
} as const;
