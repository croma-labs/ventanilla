import { site } from "@country/site";
import type { Chrome } from "../countries/types";

/** The header, menu and footer text in a language the country speaks; its own language otherwise. */
export const chromeOf = (lang: string = site.lang): Chrome =>
  site.languages?.[lang as keyof NonNullable<typeof site.languages>] ?? {
    skip: "Saltar al contenido",
    home: "Inicio",
    menu: site.ui.menu,
    closeMenu: site.ui.closeMenu,
    notice: site.brand.notice,
    noticeShort: site.brand.noticeShort,
    disclaimer: site.brand.disclaimer,
    poweredBy: site.brand.poweredBy,
    nav: site.nav,
  };
