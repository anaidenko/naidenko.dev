import { refOf, toptalRef } from "./analytics";

/** Set on <html> for a visit through Toptal; its value is the visit's tag. */
export const TOPTAL_ATTRIBUTE = "data-toptal";

/**
 * The tag of a visit through Toptal, or null for any other visit. Toptal's profile guidance allows
 * no link to a page "emphasizing your contact information", so such a visit sees no form and no
 * email. On naidenko.dev a link placed on Toptal is tagged ?ref=toptal… (the profile's "toptal", an
 * application's "toptal-509168"). Every visit to the Toptal build is one, so its tag may be "", and
 * a bare tag, such as a job's ID, reads as toptalRef keeps it.
 */
export function toptalTag(search: string, toptalSite: boolean): string | null {
    const tag = refOf(search);
    if (toptalSite) return tag && toptalRef(tag);
    return tag.startsWith("toptal") ? tag : null;
}

/**
 * toptalTag as an inline script for <head>: it marks <html> before the first paint, so the header's
 * contact button never flashes on a visit through Toptal, and RefLink carries the tag after a move
 * within the site. The tests hold it to toptalTag.
 */
export function toptalScript(toptalSite: boolean): string {
    const mark = toptalSite ? `m=t===""||t.indexOf("toptal")===0?t:("toptal-"+t).slice(0,40)` : `m=t.indexOf("toptal")===0?t:null`;
    return `try{var p=new URLSearchParams(location.search),t=(p.get("ref")||p.get("utm_source")||"").toLowerCase().replace(/[^a-z0-9._-]/g,"").slice(0,40),${mark};if(m!==null)document.documentElement.setAttribute("${TOPTAL_ATTRIBUTE}",m)}catch(e){}`;
}

/** The tag the inline script left on <html>, or null on a visit not through Toptal. */
export function markedTag(root: Element): string | null {
    return root.getAttribute(TOPTAL_ATTRIBUTE);
}
