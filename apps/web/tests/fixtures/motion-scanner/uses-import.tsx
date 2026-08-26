import { motion } from "framer-motion";
import { cardVariants } from "./imported-variants";

export function AlwaysRenderedImportedHide() {
  return <motion.div initial="hidden" variants={cardVariants} />;
}
