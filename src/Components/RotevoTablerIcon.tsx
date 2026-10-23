// Official Tabler Icons outline SVG artwork, MIT-licensed.
// Source: https://github.com/tabler/tabler-icons ; selected for Rotevo Ecossistema 2027.
// SVG paths are kept from the upstream artwork. Keep the MIT license notice when redistributing.
import type { ReactNode } from "react";

const artwork: Record<string, ReactNode> = {
  "h-2": <>
    <path d="M17 12a2 2 0 1 1 4 0c0 .591 -.417 1.318 -.816 1.858l-3.184 4.143l4 0" />
    <path d="M4 6v12" />
    <path d="M12 6v12" />
    <path d="M11 18h2" />
    <path d="M3 18h2" />
    <path d="M4 12h8" />
    <path d="M3 6h2" />
    <path d="M11 6h2" />
  </>,
  "align-left": <>
    <path d="M4 6l16 0" />
    <path d="M4 12l10 0" />
    <path d="M4 18l14 0" />
  </>,
  "table": <>
    <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14" />
    <path d="M3 10h18" />
    <path d="M10 3v18" />
  </>,
  "photo": <>
    <path d="M15 8h.01" />
    <path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12" />
    <path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5" />
    <path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3" />
  </>,
  "chart-bar": <>
    <path d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -6" />
    <path d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -10" />
    <path d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1l0 -14" />
    <path d="M4 20h14" />
  </>,
  "bulb": <>
    <path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7" />
    <path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3" />
    <path d="M9.7 17l4.6 0" />
  </>,
  "arrows-split": <>
    <path d="M21 17h-8l-3.5 -5h-6.5" />
    <path d="M21 7h-8l-3.495 5" />
    <path d="M18 10l3 -3l-3 -3" />
    <path d="M18 20l3 -3l-3 -3" />
  </>,
  "number-123": <>
    <path d="M3 10l2 -2v8" />
    <path d="M9 8h3a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-2a1 1 0 0 0 -1 1v2a1 1 0 0 0 1 1h3" />
    <path d="M17 8h2.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1 -1.5 1.5h-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1 -1.5 1.5h-2.5" />
  </>,

  "folder-lock": <><path d="M13 19h-8a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" />
  <path d="M17 19a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-2" />
  <path d="M18 18v-1.5a1.5 1.5 0 1 1 3 0v1.5" /></>,
  "brand-youtube": <><path d="M3 7.5a3.5 3.5 0 0 1 3.5 -3.5h11a3.5 3.5 0 0 1 3.5 3.5v9a3.5 3.5 0 0 1 -3.5 3.5h-11a3.5 3.5 0 0 1 -3.5 -3.5z" /><path d="M10 9l5 3l-5 3z" /></>,
  "brand-linkedin": <><path d="M4 4h16v16h-16z" /><path d="M8 10v7" /><path d="M8 7v.01" /><path d="M12 17v-7" /><path d="M12 13a3 3 0 0 1 6 0v4" /></>,

  "key": <><path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0" /><path d="M15 9h.01" /></>,
  "lock": <><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" /></>,
  "folder-open": <><path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2" /></>,
  "logout": <><path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" /><path d="M9 12h12l-3 -3" /><path d="M18 15l3 -3" /></>,
  "users": <>
    <path d="M5 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
    <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
  </>,
  "users-group": <>
    <path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1" />
    <path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M17 10h2a2 2 0 0 1 2 2v1" />
    <path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
    <path d="M3 13v-1a2 2 0 0 1 2 -2h2" />
  </>,
  "list-check": <>
    <path d="M3.5 5.5l1.5 1.5l2.5 -2.5" />
    <path d="M3.5 11.5l1.5 1.5l2.5 -2.5" />
    <path d="M3.5 17.5l1.5 1.5l2.5 -2.5" />
    <path d="M11 6l9 0" />
    <path d="M11 12l9 0" />
    <path d="M11 18l9 0" />
  </>,
  "calendar": <>
    <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" />
    <path d="M16 3v4" />
    <path d="M8 3v4" />
    <path d="M4 11h16" />
    <path d="M11 15h1" />
    <path d="M12 15v3" />
  </>,
  "currency-dollar": <><path d="M16.7 8a3 3 0 0 0 -2.7 -2h-4a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-4a3 3 0 0 1 -2.7 -2" /><path d="M12 3v3m0 12v3" /></>,
  "rocket": <>
    <path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3" />
    <path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3" />
    <path d="M14 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
  </>,
  "alert-circle": <>
    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>,
  "lifebuoy": <>
    <path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M15 15l3.35 3.35" />
    <path d="M9 15l-3.35 3.35" />
    <path d="M5.65 5.65l3.35 3.35" />
    <path d="M18.35 5.65l-3.35 3.35" />
  </>,
  "hourglass": <>
    <path d="M6.5 7h11" />
    <path d="M6.5 17h11" />
    <path d="M6 20v-2a6 6 0 1 1 12 0v2a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1" />
    <path d="M6 4v2a6 6 0 1 0 12 0v-2a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1" />
  </>,
  "clock": <>
    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
    <path d="M12 7v5l3 3" />
  </>,
  "square-rounded-plus": <>
    <path d="M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9" />
    <path d="M15 12h-6" />
    <path d="M12 9v6" />
  </>,
  "search": <>
    <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
    <path d="M21 21l-6 -6" />
  </>,
  "filter": <>
    <path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227" />
  </>,
  "user-check": <>
    <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
    <path d="M6 21v-2a4 4 0 0 1 4 -4h4" />
    <path d="M15 19l2 2l4 -4" />
  </>,
  "folder": <>
    <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" />
  </>,
  "arrows-sort": <>
    <path d="M3 9l4 -4l4 4m-4 -4v14" />
    <path d="M21 15l-4 4l-4 -4m4 4v-14" />
  </>,
  "list": <>
    <path d="M9 6l11 0" />
    <path d="M9 12l11 0" />
    <path d="M9 18l11 0" />
    <path d="M5 6l0 .01" />
    <path d="M5 12l0 .01" />
    <path d="M5 18l0 .01" />
  </>,
  "layout-kanban": <>
    <path d="M4 4l6 0" />
    <path d="M14 4l6 0" />
    <path d="M4 10a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2l0 -8" />
    <path d="M14 10a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2l0 -2" />
  </>,
  "calendar-week": <>
    <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12" />
    <path d="M16 3v4" />
    <path d="M8 3v4" />
    <path d="M4 11h16" />
    <path d="M7 14h.013" />
    <path d="M10.01 14h.005" />
    <path d="M13.01 14h.005" />
    <path d="M16.015 14h.005" />
    <path d="M13.015 17h.005" />
    <path d="M7.01 17h.005" />
    <path d="M10.01 17h.005" />
  </>,
  "flag": <>
    <path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0v-9" />
    <path d="M5 21v-7" />
  </>,
  "link": <>
    <path d="M9 15l6 -6" />
    <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464" />
    <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463" />
  </>,
  "message-circle": <>
    <path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1" />
  </>,
  "circle-check": <>
    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M9 12l2 2l4 -4" />
  </>,
  "view-360-arrow": <>
    <path d="M17 15.328c2.414 -.718 4 -1.94 4 -3.328c0 -2.21 -4.03 -4 -9 -4s-9 1.79 -9 4s4.03 4 9 4" />
    <path d="M9 13l3 3l-3 3" />
  </>,
  "history": <>
    <path d="M12 8l0 4l2 2" />
    <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
  </>,
  "x": <>
    <path d="M18 6l-12 12" />
    <path d="M6 6l12 12" />
  </>,
  "layout-dashboard": <>
    <path d="M5 4h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1" />
    <path d="M5 16h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1" />
    <path d="M15 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1" />
    <path d="M15 4h4a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1" />
  </>,
  "report": <>
    <path d="M8 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h5.697" />
    <path d="M18 14v4h4" />
    <path d="M18 11v-4a2 2 0 0 0 -2 -2h-2" />
    <path d="M8 5a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2" />
    <path d="M14 18a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
    <path d="M8 11h4" />
    <path d="M8 15h3" />
  </>,
  "shopping-bag": <>
    <path d="M6.331 8h11.339a2 2 0 0 1 1.977 2.304l-1.255 8.152a3 3 0 0 1 -2.966 2.544h-6.852a3 3 0 0 1 -2.965 -2.544l-1.255 -8.152a2 2 0 0 1 1.977 -2.304" />
    <path d="M9 11v-5a3 3 0 0 1 6 0v5" />
  </>,
  "filter-2-search": <>
    <path d="M4 6h16" />
    <path d="M6 12h8.5" />
    <path d="M9 18h2" />
    <path d="M15 18c0 .796 .316 1.559 .879 2.121c.563 .563 1.326 .879 2.121 .879c.796 0 1.559 -.316 2.121 -.879c.563 -.563 .879 -1.326 .879 -2.121c0 -.796 -.316 -1.559 -.879 -2.121c-.563 -.563 -1.326 -.879 -2.121 -.879c-.796 0 -1.559 .316 -2.121 .879c-.563 .563 -.879 1.326 -.879 2.121" />
    <path d="M20.2 20.2l1.8 1.8" />
  </>,
  "user": <>
    <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
    <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
  </>,
  "shape": <>
    <path d="M3 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M17 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M3 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M17 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M5 7l0 10" />
    <path d="M7 5l10 0" />
    <path d="M7 19l10 0" />
    <path d="M19 7l0 10" />
  </>,
  "target-arrow": <>
    <path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    <path d="M12 7a5 5 0 1 0 5 5" />
    <path d="M13 3.055a9 9 0 1 0 7.941 7.945" />
    <path d="M15 6v3h3l3 -3h-3v-3l-3 3" />
    <path d="M15 9l-3 3" />
  </>,
  "brand-instagram": <>
    <path d="M3 7a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v10a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4l0 -10" />
    <path d="M8.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 0 0 -7 0" />
    <path d="M17 7v.01" />
  </>,
  "speakerphone": <>
    <path d="M18 8a3 3 0 0 1 0 6" />
    <path d="M10 8v11a1 1 0 0 1 -1 1h-1a1 1 0 0 1 -1 -1v-5" />
    <path d="M12 8l4.524 -3.77a.9 .9 0 0 1 1.476 .692v12.156a.9 .9 0 0 1 -1.476 .692l-4.524 -3.77h-8a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h8" />
  </>,
  "chart-funnel": <>
    <path d="M4.387 3h15.226a1 1 0 0 1 .948 1.316l-5.105 15.316a2 2 0 0 1 -1.898 1.368h-3.116a2 2 0 0 1 -1.898 -1.368l-5.104 -15.316a1 1 0 0 1 .947 -1.316" />
    <path d="M5 9h14" />
    <path d="M7 15h10" />
  </>,
  "bolt": <>
    <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />
  </>,
  "chart-pie": <>
    <path d="M10 3.2a9 9 0 1 0 10.8 10.8a1 1 0 0 0 -1 -1h-6.8a2 2 0 0 1 -2 -2v-7a.9 .9 0 0 0 -1 -.8" />
    <path d="M15 3.5a9 9 0 0 1 5.5 5.5h-4.5a1 1 0 0 1 -1 -1v-4.5" />
  </>,
  "chart-dots-3": <>
    <path d="M3 7a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M14 15a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M15 6a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M3 18a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M9 17l5 -1.5" />
    <path d="M6.5 8.5l7.81 5.37" />
    <path d="M7 7l8 -1" />
  </>,
  "device-analytics": <>
    <path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -10" />
    <path d="M7 20l10 0" />
    <path d="M9 16l0 4" />
    <path d="M15 16l0 4" />
    <path d="M8 12l3 -3l2 2l3 -3" />
  </>,
  "alert-square-rounded": <>
    <path d="M12 3c7.2 0 9 1.8 9 9c0 7.2 -1.8 9 -9 9c-7.2 0 -9 -1.8 -9 -9c0 -7.2 1.8 -9 9 -9" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </>,
  "timeline-event-text": <>
    <path d="M10 20a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
    <path d="M10 20h-6" />
    <path d="M14 20h6" />
    <path d="M12 15l-2 -2h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h10a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-3l-2 2" />
    <path d="M9 6h6" />
    <path d="M9 9h3" />
  </>,
  "calendar-heart": <>
    <path d="M11.5 21h-5.5a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4" />
    <path d="M16 3v4" />
    <path d="M8 3v4" />
    <path d="M4 11h16" />
    <path d="M18 22l3.35 -3.284a2.143 2.143 0 0 0 .005 -3.071a2.242 2.242 0 0 0 -3.129 -.006l-.224 .22l-.223 -.22a2.242 2.242 0 0 0 -3.128 -.006a2.143 2.143 0 0 0 -.006 3.071l3.355 3.296" />
  </>,
};

export type RotevoIconName = "h-2" | "align-left" | "table" | "photo" | "chart-bar" | "bulb" | "arrows-split" | "number-123" | "folder-lock" | "key" | "logout" | "folder-open" | "lock" | "users" | "users-group" | "list-check" | "calendar" | "currency-dollar" | "rocket" | "alert-circle" | "lifebuoy" | "hourglass" | "clock" | "square-rounded-plus" | "search" | "filter" | "user-check" | "folder" | "arrows-sort" | "list" | "layout-kanban" | "calendar-week" | "flag" | "link" | "message-circle" | "circle-check" | "view-360-arrow" | "history" | "x" | "layout-dashboard" | "report" | "shopping-bag" | "filter-2-search" | "user" | "shape" | "target-arrow" | "brand-instagram" | "brand-youtube" | "brand-linkedin" | "speakerphone" | "chart-funnel" | "bolt" | "chart-pie" | "chart-dots-3" | "device-analytics" | "alert-square-rounded" | "timeline-event-text" | "calendar-heart";

export function RotevoTablerIcon({name, size=24, stroke=2.3, className=""}: {
  name:RotevoIconName; size?:number; stroke?:number; className?:string
}) {
  return <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
    className={className}>{artwork[name]}</svg>;
}
