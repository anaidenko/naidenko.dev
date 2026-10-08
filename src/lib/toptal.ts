import { refOf } from "./analytics";

/** Set on <html> for a visit through Toptal; its value is the visit's tag. */
export const TOPTAL_ATTRIBUTE = "data-toptal";

/**
 * The tag of a visit through Toptal, or null for any other visit. Toptal's profile guidance allows
 * no link to a page "emphasizing your contact information", so such a visit sees no form and no
 * email. A link placed on Toptal is tagged ?ref=toptal… (the profile's "toptal", an application's
 * "toptal-509168"); the host made for Toptal's links needs no tag, so its tag may be "".
 */
export function toptalTag(search: string, hostname: string): string | null {
    const tag = refOf(search);
    if (tag.startsWith("toptal")) return tag;
    return hostname.startsWith("toptal.") ? "" : null;
}

/**
 * toptalTag as an inline script for <head>: it marks <html> before the first paint, so the header's
 * contact button never flashes on a visit through Toptal. The tests hold it to toptalTag.
 */
export const TOPTAL_SCRIPT = `try{var p=new URLSearchParams(location.search),t=(p.get("ref")||p.get("utm_source")||"").toLowerCase().replace(/[^a-z0-9._-]/g,"").slice(0,40),m=t.indexOf("toptal")===0?t:location.hostname.indexOf("toptal.")===0?"":null;if(m!==null)document.documentElement.setAttribute("${TOPTAL_ATTRIBUTE}",m)}catch(e){}`;

/** The tag the inline script left on <html>, or null on a visit not through Toptal. */
export function markedTag(root: Element): string | null {
    return root.getAttribute(TOPTAL_ATTRIBUTE);
}
