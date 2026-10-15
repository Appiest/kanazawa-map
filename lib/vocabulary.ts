export type Term<Id extends string> = { readonly id: Id; readonly label: string };

/**
 * A fixed list of answers people pick from. Anything outside it is dropped
 * rather than stored and shown, so filtering works and nothing needs moderating.
 */
export function vocabulary<Id extends string>(terms: readonly Term<Id>[]) {
  const byId = new Map<string, string>(terms.map((term) => [term.id, term.label]));
  return {
    terms,
    ids: terms.map((term) => term.id),
    keepKnown: (ids: readonly string[]): Id[] => ids.filter((id): id is Id => byId.has(id)),
    labelFor: (id: string): string => byId.get(id) ?? id,
  };
}

/** The list with `id` added, or taken out if it was already there. */
export function toggled<Id extends string>(list: readonly Id[], id: Id): Id[] {
  return list.includes(id) ? list.filter((kept) => kept !== id) : [...list, id];
}
