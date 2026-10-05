import type { Authority, ResearchConfig } from "../../server/research";
import { constitutionalRulings, norms, readNorm, taxDoctrine } from "../../server/tools/co";
import { readPage, webSearch } from "../../server/tools/global";

const authorities: Authority[] = [
  {
    domain: "registraduria.gov.co",
    covers: "cédula de ciudadanía (primera vez, duplicado, rectificación, renovación), tarjeta de identidad, registro civil, inscripción para votar, elecciones",
    pages: [
      { url: "https://www.registraduria.gov.co/Sin-pedir-cita-y-sin-acudir-a-la-Registraduria-tramite-el-duplicado-de-su.html", title: "Duplicado de la cédula en línea · Registraduría" },
      { url: "https://www.registraduria.gov.co/-Tramites-de-la-cedula-de-ciudadania-.html", title: "Trámites de la cédula de ciudadanía · Registraduría" },
    ],
  },
  { domain: "cancilleria.gov.co", covers: "pasaporte, apostilla y legalización de documentos, visas, consulados, colombianos en el exterior" },
  { domain: "migracioncolombia.gov.co", covers: "migración, extranjeros en Colombia, PPT y permisos, cédula de extranjería, salida del país de menores" },
  { domain: "dian.gov.co", covers: "RUT, impuestos, declaración de renta, IVA, régimen simple, facturación electrónica, aduanas" },
  { domain: "supersalud.gov.co", covers: "quejas contra EPS, derechos de los usuarios de salud, portabilidad, cambio de EPS" },
  { domain: "minsalud.gov.co", covers: "afiliación a salud, régimen contributivo y subsidiado, EPS, medicamentos, vacunación" },
  { domain: "miseguridadsocial.gov.co", covers: "traslado de EPS en línea, afiliación transaccional" },
  { domain: "adres.gov.co", covers: "consulta de afiliación a salud (BDUA), pagos del sistema de salud" },
  { domain: "colpensiones.gov.co", covers: "pensión de vejez, semanas cotizadas, historia laboral, Colombia Mayor, BEPS" },
  { domain: "mintrabajo.gov.co", covers: "derechos laborales, contratos, liquidación, salario mínimo, vacaciones, licencias, jornada laboral" },
  { domain: "sisben.gov.co", covers: "Sisbén: encuesta, inscripción, grupos y clasificación, actualización" },
  { domain: "libretamilitar.mil.co", covers: "libreta militar, definición de la situación militar" },
  { domain: "simit.org.co", covers: "comparendos y multas de tránsito, pago y acuerdos de pago" },
  { domain: "runt.gov.co", covers: "licencia de conducción, registro de vehículos, SOAT, revisión técnico-mecánica" },
  { domain: "minvivienda.gov.co", covers: "subsidios de vivienda, Mi Casa Ya, arrendamiento" },
  { domain: "icetex.gov.co", covers: "créditos y becas para estudiar" },
  { domain: "sena.edu.co", covers: "formación gratuita, cursos, Agencia Pública de Empleo" },
  { domain: "icbf.gov.co", covers: "niñez y familia, cuota alimentaria, adopción, custodia, violencia intrafamiliar" },
  { domain: "ramajudicial.gov.co", covers: "procesos judiciales, juzgados, consulta de procesos, radicación de tutelas y demandas" },
  { domain: "corteconstitucional.gov.co", covers: "acción de tutela, derechos fundamentales, sentencias constitucionales" },
  { domain: "policia.gov.co", covers: "antecedentes judiciales, denuncias, pérdida de documentos, seguridad" },
  { domain: "procuraduria.gov.co", covers: "antecedentes disciplinarios, quejas contra servidores públicos" },
  { domain: "contraloria.gov.co", covers: "antecedentes fiscales, control fiscal" },
  { domain: "sic.gov.co", covers: "protección al consumidor, garantías, reclamos a empresas, datos personales (habeas data), marcas" },
  { domain: "supersociedades.gov.co", covers: "sociedades comerciales, insolvencia de empresas" },
  { domain: "rues.org.co", covers: "registro mercantil, crear empresa, matrícula mercantil, certificados de cámara de comercio" },
  { domain: "funcionpublica.gov.co", covers: "empleo público, normas y leyes vigentes, servidores públicos" },
  { domain: "mineducacion.gov.co", covers: "educación, convalidación de títulos, colegios y universidades" },
  { domain: "bogota.gov.co", covers: "trámites y servicios de la Alcaldía de Bogotá" },
  { domain: "movilidadbogota.gov.co", covers: "tránsito en Bogotá, pico y placa, patios" },
  { domain: "gov.co", covers: "portal único del Estado: guía general de trámites y servicios" },
  { domain: "supernotariado.gov.co", covers: "certificado de tradición y libertad de inmuebles, registro de propiedad, notarías, escrituras" },
  { domain: "prosperidadsocial.gov.co", covers: "Renta Ciudadana, devolución del IVA, programas sociales y transferencias monetarias" },
  { domain: "icfes.gov.co", covers: "pruebas Saber 11, Saber Pro y Saber TyT: inscripción, citación y resultados" },
  { domain: "fiscalia.gov.co", covers: "denuncias penales, denuncia virtual, consulta de noticias criminales, víctimas" },
];

export const sources: ResearchConfig = {
  web: webSearch({ hint: "Colombia", scope: "site:gov.co" }),
  read: readPage,
  authorities,
  datasets: {
    normas: {
      tool: norms,
      covers: "texto y vigencia de leyes, decretos, resoluciones y conceptos (Función Pública)",
      reader: async (candidate, context) => {
        if (!candidate.ref) return null;
        const result = await readNorm.run({ norm_id: candidate.ref }, context);
        return "error" in result ? null : ((result.results as { text?: string } | null)?.text ?? null);
      },
    },
    jurisprudencia: { tool: constitutionalRulings, covers: "sentencias de la Corte Constitucional: tutela y derechos fundamentales" },
    dian: { tool: taxDoctrine, covers: "doctrina tributaria de la DIAN: oficios y conceptos sobre impuestos" },
  },
};
