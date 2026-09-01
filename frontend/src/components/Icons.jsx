const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const IconOverview = (p) => (
  <svg {...base} {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
);
export const IconLog = (p) => (
  <svg {...base} {...p}><path d="M9 3h6l1 3H8l1-3z" /><rect x="5" y="6" width="14" height="15" rx="1.5" /><path d="M9 12h6M9 16h6" /></svg>
);
export const IconChart = (p) => (
  <svg {...base} {...p}><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M2 20h20" /></svg>
);
export const IconPayments = (p) => (
  <svg {...base} {...p}><rect x="2.5" y="6" width="19" height="13" rx="2" /><path d="M2.5 10h19" /><path d="M6 15h4" /></svg>
);
export const IconPeople = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.2" /><path d="M2.7 20c.6-3.6 3.2-5.7 6.3-5.7s5.7 2.1 6.3 5.7" /><circle cx="17.5" cy="8.5" r="2.4" /><path d="M15.3 14.5c2.6.1 4.6 2 5.1 5" /></svg>
);
export const IconCompanies = (p) => (
  <svg {...base} {...p}><rect x="3" y="8" width="9" height="13" rx="1" /><rect x="13" y="3" width="8" height="18" rx="1" /><path d="M6 12h.01M6 15h.01M6 18h.01M17 7h.01M17 10h.01M17 13h.01M17 16h.01" /></svg>
);
export const IconLogout = (p) => (
  <svg {...base} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const IconMenu = (p) => (
  <svg {...base} {...p}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
);
export const IconClose = (p) => (
  <svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const IconSearch = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);
export const IconTrash = (p) => (
  <svg {...base} {...p}><path d="M4 7h16" /><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" /><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></svg>
);
export const IconDownload = (p) => (
  <svg {...base} {...p}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 20h16" /></svg>
);
export const IconChevron = (p) => (
  <svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>
);
