import { TOPTAL_BADGE_HTML } from '@/content/toptal-badge';

/** Toptal's badge, exactly as the Talent Portal produced it. Do not restyle it. */
export function ToptalBadge() {
  return <div className="shrink-0" dangerouslySetInnerHTML={{ __html: TOPTAL_BADGE_HTML }} />;
}
