// Test fixture, not application code. Nothing under `src/app` or
// `src/components` imports this, and nothing should: it deliberately contains
// the zero-opacity initial state that `tests/motion-visibility.test.ts` forbids
// in real components.
//
// It lives under `src/` on purpose. The motion scanner resolves `variants=`
// bindings through the tsconfig `paths` mapping, and the only way to prove that
// mapping is really being read is to import this module as a genuine
// `@/lib/...` specifier. Repoint `"@/*"` in tsconfig.json and the scanner stops
// resolving it, which turns the alias test red.
export const aliasCardVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
