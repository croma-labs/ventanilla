import type { Authority, ResearchConfig } from "../../server/research";
import { constitutionalRulings, decrees, readDecree } from "../../server/tools/sv";
import { readPage, webSearch } from "../../server/tools/global";

const authorities: Authority[] = [
  {
    domain: "rnpn.gob.sv",
    covers: "DUI (primera vez, reposición, renovación, modificación, DUI a domicilio), carné de minoridad, partidas de nacimiento, matrimonio y defunción, registro del estado familiar",
    pages: [{ url: "https://www.rnpn.gob.sv/servicios/certificacion-de-partidas-en-el-salvador/", title: "Certificación de partidas · RNPN" }],
  },
  { domain: "migracion.gob.sv", covers: "pasaporte (primera vez, renovación, menores), residencia de extranjeros, carné de residente, control migratorio, naturalización" },
  { domain: "rree.gob.sv", covers: "apostilla y autenticas, servicios consulares, pasaporte y DUI en el exterior, salvadoreños en el exterior, visas" },
  { domain: "simple.sv", covers: "ventanilla única del Gobierno: trámites en línea como antecedentes penales, solvencia policial, partidas, apostilla y muchos más" },
  { domain: "mh.gob.sv", covers: "NIT y homologación con el DUI, declaración de renta, IVA, facturación electrónica (DTE), aduanas, solvencia de Hacienda, pago de multas de tránsito" },
  { domain: "cnr.gob.sv", covers: "registro de comercio, crear empresa o sociedad (SAS), matrícula de empresa, registro de propiedad e inmuebles, marcas, catastro" },
  { domain: "vmt.gob.sv", covers: "licencia de conducir, tarjeta de circulación, placas, transporte público, infracciones de tránsito" },
  { domain: "sertracen.com.sv", covers: "trámites de licencia de conducir y tarjeta de circulación (concesionario del Viceministerio de Transporte)" },
  { domain: "isss.gob.sv", covers: "afiliación e inscripción al Seguro Social, cotizaciones, incapacidades, servicios de salud del ISSS, régimen de independientes" },
  { domain: "salud.gob.sv", covers: "salud pública, vacunación, establecimientos del MINSAL, permisos sanitarios" },
  { domain: "mtps.gob.sv", covers: "derechos laborales, salario mínimo, aguinaldo, vacaciones, indemnización, despidos, inspección de trabajo, empleo" },
  { domain: "ssf.gob.sv", covers: "pensiones y AFP, sistema financiero, reclamos a bancos y aseguradoras" },
  { domain: "pensiones.gob.sv", covers: "Instituto Salvadoreño de Pensiones: pensiones del sistema público" },
  { domain: "pnc.gob.sv", covers: "solvencia policial, denuncias, seguridad" },
  { domain: "seguridad.gob.sv", covers: "antecedentes penales, Ministerio de Justicia y Seguridad Pública" },
  { domain: "pgr.gob.sv", covers: "cuota alimenticia, asistencia legal gratuita, familia, defensoría pública, derechos laborales" },
  { domain: "fiscalia.gob.sv", covers: "denuncias penales, víctimas" },
  { domain: "defensoria.gob.sv", covers: "derechos del consumidor, reclamos a empresas y comercios, garantías" },
  { domain: "fsv.gob.sv", covers: "créditos de vivienda del Fondo Social para la Vivienda, precalificación" },
  { domain: "fonavipo.gob.sv", covers: "vivienda popular y subsidios de vivienda" },
  { domain: "vivienda.gob.sv", covers: "Ministerio de Vivienda, programas habitacionales" },
  { domain: "mined.gob.sv", covers: "educación, títulos y certificados, incorporación de títulos, PAES/AVANZO, becas" },
  { domain: "tse.gob.sv", covers: "elecciones, padrón electoral, voto en el exterior" },
  { domain: "csj.gob.sv", covers: "Corte Suprema de Justicia: tribunales, autorización de abogados y notarios, procesos judiciales" },
  { domain: "asamblea.gob.sv", covers: "leyes y decretos de la Asamblea Legislativa" },
  { domain: "conapina.gob.sv", covers: "niñez y adolescencia, protección integral, Ley Crecer Juntos" },
  { domain: "omr.gob.sv", covers: "catálogo oficial de trámites con requisitos, costos y plazos" },
];

export const sources: ResearchConfig = {
  web: webSearch({ hint: "El Salvador", scope: "(site:gob.sv OR site:simple.sv)" }),
  read: readPage,
  authorities,
  datasets: {
    decretos: {
      tool: decrees,
      covers: "leyes, códigos, reglamentos y decretos de la Asamblea Legislativa",
      reader: async (candidate, context) => {
        if (!candidate.ref) return null;
        const result = await readDecree.run({ decree_id: candidate.ref }, context);
        return "error" in result ? null : ((result.results as { text?: string } | null)?.text ?? null);
      },
    },
    jurisprudencia: { tool: constitutionalRulings, covers: "resoluciones de la Sala de lo Constitucional: amparos, hábeas corpus e inconstitucionalidades" },
  },
};
