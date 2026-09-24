export interface Project {
  name: string;
  url: string;
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

/** From the repositories' READMEs and GitHub descriptions, read 2026-09-24. All three are MIT. */
export const projects: readonly Project[] = [
  {
    name: 'claude-video-digest',
    url: 'https://github.com/anaidenko/claude-video-digest',
    description:
      'Turns any video into a readable digest: a timestamped contact sheet, individual frames, and a transcript grouped under the frame each line was spoken over. Claude can’t play video; this gives it something it can actually read. ffmpeg and local Whisper, no cloud, no API keys.',
    chips: ['Claude Code', 'ffmpeg', 'Whisper', 'Shell'],
    image: {
      src: '/projects/claude-video-digest.jpg',
      alt: 'A contact sheet: ten timestamped frames from a short animated film',
      width: 800,
      height: 449,
      credit: { text: 'Frames: Big Buck Bunny © Blender Foundation, CC BY 3.0', url: 'https://www.bigbuckbunny.org' },
    },
  },
  {
    name: 'claude-notify-resume',
    url: 'https://github.com/anaidenko/claude-notify-resume',
    description:
      'Desktop notifications for Claude Code that tell you which conversation replied, or is waiting on you, and take you back into it. macOS and Linux.',
    chips: ['Claude Code', 'Shell', 'macOS', 'Linux'],
  },
  {
    name: 'claude-plugins',
    url: 'https://github.com/anaidenko/claude-plugins',
    description: 'The marketplace both plugins install from: add it once, then install whichever plugin you want.',
    chips: ['Claude Code', 'Marketplace'],
  },
];

export const installCommands: readonly string[] = [
  'claude plugin marketplace add anaidenko/claude-plugins',
  'claude plugin install claude-video-digest@anaidenko',
  'claude plugin install claude-notify-resume@anaidenko',
];
