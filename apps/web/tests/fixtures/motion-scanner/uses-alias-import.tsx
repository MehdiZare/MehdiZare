import { motion } from "framer-motion";
// A genuine `@/lib/...` specifier: `@/*` maps to `./src/*`, so the scanner only
// finds this module by reading the tsconfig `paths` mapping. Repoint `"@/*"`
// and the hiding variant below stops resolving, which turns the alias test red.
import { aliasCardVariants } from "@/lib/__fixtures__/motion-variants";

export function AlwaysRenderedAliasImportHide() {
  return <motion.div initial="hidden" variants={aliasCardVariants} />;
}
