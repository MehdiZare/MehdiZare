import { motion } from "framer-motion";

declare const orphanVariants: { hidden: { opacity: number } };

export function AlwaysRenderedUnresolvedHide() {
  return <motion.div initial="hidden" variants={orphanVariants} />;
}
