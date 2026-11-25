import type { Authority, ResearchConfig } from "../../server/research";
import { readPage, webSearch } from "../../server/tools/global";

const authorities: Authority[] = [
  {
    domain: "argentina.gob.ar",
    covers:
      "portal nacional: DNI y pasaporte (RENAPER), antecedentes penales (Reincidencia), residencia y radicación de extranjeros (Migraciones), títulos y becas Progresar, licencia nacional de conducir, sociedades y SAS (IGJ), registro MiPyME, defensa del consumidor, derechos laborales, obras sociales y prepagas (Superintendencia de Servicios de Salud), alimentos y registros sanitarios (ANMAT, SENASA)",
  },
  {
    domain: "buenosaires.gob.ar",
    covers:
      "Ciudad Autónoma de Buenos Aires: habilitación de comercios y actividades económicas (Agencia Gubernamental de Control), permisos de uso del espacio público, ferias y venta ambulante, licencia de conducir en la Ciudad, partidas del Registro Civil, turnos, infracciones de tránsito, ABL, escuelas y salud de la Ciudad",
  },
  { domain: "arca.gob.ar", covers: "ARCA (ex AFIP): CUIT, clave fiscal, monotributo (alta, categorías, recategorización, baja), facturación electrónica, Ganancias, IVA, Bienes Personales, aduana, empleados y casas particulares" },
  { domain: "afip.gob.ar", covers: "sitio anterior de ARCA: monotributo, clave fiscal, facturación y guías paso a paso" },
  { domain: "anses.gob.ar", covers: "CUIL, Asignación Universal por Hijo, asignaciones familiares, jubilaciones y pensiones, prestación por desempleo, PUAM, fechas de cobro, Mi ANSES" },
  { domain: "agip.gob.ar", covers: "impuestos de la Ciudad de Buenos Aires: Ingresos Brutos, Régimen Simplificado, ABL, patentes, sellos, clave Ciudad" },
  { domain: "boletinoficial.buenosaires.gob.ar", covers: "Boletín Oficial de la Ciudad de Buenos Aires: leyes, decretos, resoluciones y disposiciones porteñas con su fecha de publicación" },
  { domain: "boletinoficial.gob.ar", covers: "Boletín Oficial de la República Argentina: leyes, decretos y resoluciones nacionales del día y anteriores" },
  { domain: "infoleg.gob.ar", covers: "texto actualizado de leyes, decretos y resoluciones nacionales" },
  { domain: "saij.gob.ar", covers: "Sistema Argentino de Información Jurídica: legislación nacional y provincial, jurisprudencia y doctrina" },
  { domain: "migraciones.gov.ar", covers: "Dirección Nacional de Migraciones: residencia temporaria y permanente, radicación, ingreso y egreso del país, permisos de salida de menores" },
  { domain: "cancilleria.gob.ar", covers: "apostilla y legalizaciones, consulados, argentinos en el exterior, visas" },
  { domain: "dnrpa.gov.ar", covers: "Registro de la Propiedad Automotor: transferencia, patentamiento, cédula del automotor, informes de dominio, aranceles" },
  { domain: "pami.org.ar", covers: "PAMI: afiliación, medicamentos gratis, médico de cabecera, credencial, trámites de jubilados y pensionados" },
  { domain: "bcra.gob.ar", covers: "Banco Central: central de deudores, reclamos a bancos y billeteras, cuentas gratuitas, tasas y tipo de cambio oficial" },
  { domain: "electoral.gob.ar", covers: "Cámara Nacional Electoral: padrón, dónde voto, justificación de no voto, infractores" },
  { domain: "pjn.gov.ar", covers: "Poder Judicial de la Nación: consulta de causas, juzgados, mesas de entradas" },
  { domain: "csjn.gov.ar", covers: "Corte Suprema de Justicia de la Nación: fallos y acordadas" },
  { domain: "mpf.gob.ar", covers: "Ministerio Público Fiscal de la Nación: denuncias penales federales, víctimas" },
  { domain: "mpfciudad.gob.ar", covers: "Ministerio Público Fiscal de la Ciudad: denuncias de delitos y contravenciones en la Ciudad de Buenos Aires" },
  { domain: "tramitesadistancia.gob.ar", covers: "Trámites a Distancia (TAD): plataforma para iniciar trámites nacionales en línea" },
  { domain: "gba.gob.ar", covers: "Provincia de Buenos Aires: trámites provinciales, registro de las personas, licencias, educación y salud bonaerenses" },
  { domain: "arba.gov.ar", covers: "impuestos de la Provincia de Buenos Aires: Ingresos Brutos, inmobiliario, automotor" },
];

export const sources: ResearchConfig = {
  web: webSearch({ hint: "Argentina", scope: "(site:gob.ar OR site:gov.ar)" }),
  read: readPage,
  authorities,
  datasets: {},
  scope: "the State, public services, procedures, permits, rights, laws or taxes of Argentina, its national government or the City of Buenos Aires, including opening and running a small business",
};
