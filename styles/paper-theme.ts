import type { Theme } from "protomaps-themes-base";
import { hexOf } from "./palette.ts";

type Step = Parameters<typeof hexOf>[1];
const paper = (step: Step) => hexOf("paper", step);
const water = (step: Step) => hexOf("water", step);
const land = (step: Step) => hexOf("land", step);
const sage = (step: Step) => hexOf("sage", step);
const sand = (step: Step) => hexOf("sand", step);

const LAND = land(100);
const HALO = land(100);
const LABEL = paper(650);
const LABEL_STRONG = paper(800);

/* Natural features carry hue rather than saturation: enough for the land to
   look like land, never enough to compete with a pin. Park sage sits 27
   degrees off the pin green at a quarter of its chroma, so a park cannot be
   mistaken for somebody standing in one. */
const PARK = sage(200);
const PARK_DEEP = sage(300);
const BUILT = land(200);
const BUILT_SOFT = land(300);

export const paperTheme: Theme = {
  background: LAND,
  earth: LAND,

  park_a: PARK,
  park_b: PARK_DEEP,
  wood_a: PARK,
  wood_b: PARK_DEEP,
  scrub_a: sage(200),
  scrub_b: sage(300),
  hospital: BUILT,
  industrial: BUILT,
  school: BUILT,
  pedestrian: BUILT,
  zoo: PARK,
  military: BUILT,
  aerodrome: BUILT,
  glacier: land(50),
  sand: sand(200),
  beach: sand(200),
  runway: BUILT_SOFT,

  water: water(300),
  pier: BUILT_SOFT,
  buildings: land(200),

  /* Roads are hairlines. Casings match the land so they read as a single
     stroke rather than an outlined ribbon. */
  other: land(300),
  minor_service: land(300),
  minor_a: land(400),
  minor_b: land(300),
  link: land(400),
  major: land(500),
  highway: land(500),
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
