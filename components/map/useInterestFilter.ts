"use client";

import { useCallback, useState } from "react";
import type { InterestId } from "@/lib/interests";

/** Which interests the map is narrowed to, and whether the picker is open. */
export function useInterestFilter() {
  const [selected, setSelected] = useState<InterestId[]>([]);
  const [open, setOpen] = useState(false);

  const toggle = useCallback(
    (id: InterestId) =>
      setSelected((current) =>
        current.includes(id) ? current.filter((kept) => kept !== id) : [...current, id],
      ),
    [],
  );

  const clear = useCallback(() => setSelected([]), []);

  return { selected, toggle, clear, open, setOpen };
}
