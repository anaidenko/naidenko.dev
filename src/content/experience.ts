export interface ExperienceEntry {
  period: string;
  role: string;
  company: string;
  url: string;
  summary: string;
  chips: readonly string[];
  links?: readonly { label: string; url: string }[];
}

/**
 * Condensed from the live Toptal entries: talent view saved 2026-09-23 (Buddy Punch, Brokerloop,
 * RentWise) and the public page saved 2026-09-16 (USC ICT).
 */
export const experience: readonly ExperienceEntry[] = [
  {
    period: '2019 — Present',
    role: 'Senior Mobile Developer',
    company: 'Buddy Punch',
    url: 'https://buddypunch.com/',
    summary:
      'Owned the iOS and Android app end to end as its sole developer for seven years: architecture, features, native integrations and every store release. Built Offline Mode, the product’s most requested feature of 2025, and the GPS layer the product sells on, and carried the app from Cordova to Angular 21, Ionic 8 and Capacitor 8.',
    chips: ['Angular', 'Ionic', 'Capacitor', 'TypeScript', 'Swift', 'Java'],
    links: [
      { label: 'App Store · 4.9 ★', url: 'https://apps.apple.com/us/app/buddy-punch/id1100685927' },
      { label: 'Google Play · 100,000+ installs', url: 'https://play.google.com/store/apps/details?id=com.BuddyPunch.Mobile' },
    ],
  },
  {
    period: '2020 — 2026',
    role: 'Full-stack Developer',
    company: 'Brokerloop',
    url: 'https://www.brokerloop.com/',
    summary:
      'Six years and 1,800+ commits on the Node.js API behind every listing, contact and campaign, over three engagements. Built the platform’s video conferencing product, its Stripe subscriptions and its own email infrastructure, then documented the API as an OpenAPI spec and built an MCP server so assistants like Claude can run the product through it.',
    chips: ['Node.js', 'TypeScript', 'AngularJS', 'React', 'MongoDB', 'MySQL', 'AWS', 'Stripe', 'MCP'],
  },
  {
    period: '2022 — 2025',
    role: 'MEAN Full-stack Developer',
    company: 'RentWise',
    url: 'https://www.rentwise.org/',
    summary:
      'Built the learning engine of a renter-education platform: course authoring, quizzes, certificates and pacing rules. Turned it into a paid product with PayPal checkout, moved its video library to in-house HLS streaming, and ran the security audit and fixed what it found, over three engagements.',
    chips: ['Angular', 'Node.js', 'Express', 'MongoDB', 'PayPal', 'HLS', 'ArcGIS', 'AWS'],
  },
  {
    period: '2019 — 2020',
    role: 'Senior Cross-Platform Developer',
    company: 'USC Institute for Creative Technologies',
    url: 'https://ict.usc.edu/',
    summary:
      'Took a desktop-only mental-health support app to the phone as part of the team: responsive layouts, phone-sized forms, quizzes and assessments. Packaged it with Ionic and Capacitor for the App Store and Google Play.',
    chips: ['Angular', 'NgRx', 'Ionic', 'Capacitor', 'Cordova', 'TypeScript'],
  },
];

export const fullResume = {
  label: 'View full résumé on Toptal',
  url: 'https://www.toptal.com/developers/resume/andrii-naidenko',
};
