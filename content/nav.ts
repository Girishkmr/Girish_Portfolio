/**
 * The section spine. One list, consumed by both the header nav and the page,
 * so a section can never exist without a way to reach it — or vice versa.
 *
 * `id` must match the section element's id attribute exactly; the scroll spy
 * observes these ids directly.
 */
export type NavItem = {
  id: string;
  label: string;
};

export const navItems: NavItem[] = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'awards', label: 'Awards' },
  { id: 'contact', label: 'Contact' },
];
