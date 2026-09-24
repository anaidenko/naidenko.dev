export type SectionId = 'about' | 'experience' | 'open-source' | 'services' | 'contact';

export const sections: readonly { id: SectionId; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'open-source', label: 'Open source' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
];

export const sectionIds: readonly SectionId[] = sections.map((section) => section.id);
