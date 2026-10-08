/**
 * Which site this build is: naidenko.dev, or the build for Toptal's links on toptal.naidenko.dev
 * (NEXT_PUBLIC_SITE_VARIANT=toptal). Next.js inlines the variable, so each build drops the other's
 * branches.
 */
export const TOPTAL_SITE = process.env.NEXT_PUBLIC_SITE_VARIANT === "toptal";
