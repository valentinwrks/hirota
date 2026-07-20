// Display helpers for the configured-item description lines (shared by the
// configurator right panels and the cart item cards).

/**
 * Lowercase a label/association name for a description line, keeping all-caps
 * acronyms intact: "Inoue-ha Shitoryu" → "inoue-ha shitoryu", "JKA" → "JKA".
 */
export function displayLabelName(name: string): string {
  return name
    .split(" ")
    .map((w) =>
      w.length >= 2 && /[A-Z]/.test(w) && w === w.toUpperCase()
        ? w
        : w.toLowerCase(),
    )
    .join(" ");
}
