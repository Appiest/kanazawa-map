import type { Theme } from "protomaps-themes-base";
import { hexOf } from "./palette.ts";

const paper = (step: Parameters<typeof hexOf>[1]) => hexOf("paper", step);
const water = (step: Parameters<typeof hexOf>[1]) => hexOf("water", step);

const LAND = paper(100);
const HALO = paper(100);
const LABEL = paper(650);
const LABEL_STRONG = paper(800);

/* Land uses that would normally be tinted stay on the neutral ramp.
   Green is reserved for people, so the basemap contains none of it. */
const LANDUSE_QUIET = paper(200);
const LANDUSE_SOFT = paper(300);

export const paperTheme: Theme = {
  background: LAND,
  earth: LAND,

  park_a: LANDUSE_QUIET,
  park_b: LANDUSE_SOFT,
  wood_a: LANDUSE_QUIET,
  wood_b: LANDUSE_SOFT,
  scrub_a: LANDUSE_QUIET,
  scrub_b: LANDUSE_SOFT,
  hospital: LANDUSE_QUIET,
  industrial: LANDUSE_QUIET,
  school: LANDUSE_QUIET,
  pedestrian: LANDUSE_QUIET,
  zoo: LANDUSE_QUIET,
  military: LANDUSE_QUIET,
  aerodrome: LANDUSE_QUIET,
  glacier: paper(50),
  sand: paper(200),
  beach: paper(200),
  runway: paper(300),

  water: water(300),
  pier: paper(300),
  buildings: paper(200),

  /* Roads are hairlines. Casings match the land so they read as a single
     stroke rather than an outlined ribbon. */
  other: paper(300),
  minor_service: paper(300),
  minor_a: paper(400),
  minor_b: paper(300),
  link: paper(400),
  major: paper(500),
  highway: paper(500),
  minor_service_casing: LAND,
  minor_casing: LAND,
  link_casing: LAND,
  major_casing_early: LAND,
  major_casing_late: LAND,
  highway_casing_early: LAND,
  highway_casing_late: LAND,

  tunnel_other: paper(200),
  tunnel_minor: paper(200),
  tunnel_link: paper(200),
  tunnel_major: paper(300),
  tunnel_highway: paper(300),
  tunnel_other_casing: LAND,
  tunnel_minor_casing: LAND,
  tunnel_link_casing: LAND,
  tunnel_major_casing: LAND,
  tunnel_highway_casing: LAND,

  bridges_other: paper(300),
  bridges_minor: paper(400),
  bridges_link: paper(400),
  bridges_major: paper(500),
  bridges_highway: paper(500),
  bridges_other_casing: LAND,
  bridges_minor_casing: LAND,
  bridges_link_casing: LAND,
  bridges_major_casing: LAND,
  bridges_highway_casing: LAND,

  railway: paper(300),
  boundaries: paper(400),

  roads_label_minor: paper(600),
  roads_label_minor_halo: HALO,
  roads_label_major: LABEL,
  roads_label_major_halo: HALO,

  ocean_label: water(700),
  waterway_label: water(700),
  peak_label: LABEL,
  subplace_label: LABEL,
  subplace_label_halo: HALO,
  city_label: LABEL_STRONG,
  city_label_halo: HALO,
  state_label: paper(600),
  state_label_halo: HALO,
  country_label: paper(700),
  address_label: paper(600),
  address_label_halo: HALO,

  regular: "Archivo Regular",
  bold: "Archivo Medium",
  italic: "Archivo Regular",
};
