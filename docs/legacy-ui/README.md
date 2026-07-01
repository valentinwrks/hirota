# Legacy UI — design & copy reference ONLY

Old HIROTA prototype (static HTML + Tailwind + vanilla JS). It exists so the new
build can inherit its VISUAL LANGUAGE and COPY. Nothing else.

USE from here:
- Layout structure, proportions, and the monospaced "spreadsheet" aesthetic.
- Design tokens: neutral-400 borders, 26px sticky headers, the small type scale,
  muted black/50 text, the custom radio (circle/inner-circle), and the
  selected / hover / completed states.
- Copy: the About/company column (history, offices, hours, visit policy) and the
  per-model descriptions in karate-gi-models.js. This is EN copy; JA is authored later.

IGNORE completely — obsolete / wrong:
- All JavaScript logic. The configurator logic is throwaway.
- All prices. They are placeholder USD (e.g. $250, +$15). Real prices are JPY in the
  database — see AGENTS.md §8.
- The model list / names / keys (e.g. "Tsubasa Evo 1", "tsubasa-evo-1", "kuu").
  Canonical models, classes, and availability are in AGENTS.md §8.2 and §8.4.
- Any business rule. AGENTS.md is the ONLY source of truth for rules and prices.