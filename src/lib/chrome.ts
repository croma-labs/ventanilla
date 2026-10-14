import { site } from "@country/site";
import type { Chrome } from "../countries/types";

/** The header, menu and footer text, in English where the country has it. */
export const chromeOf = (lang: string = site.lang): Chrome =>
  lang === "en" && site.english
    ? site.english
    : {
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
