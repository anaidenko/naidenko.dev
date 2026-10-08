import type * as Direct from "./ContactDirect";

/**
 * ContactDirect for the Toptal build, which next.config.ts puts in its place: that module and the
 * form it imports carry the address, and a page ships the JavaScript of every client component it
 * imports, rendered or not.
 */
export const ContactDirect: typeof Direct.ContactDirect = () => null;

export const EmailIcon: typeof Direct.EmailIcon = () => null;
