import { motion } from "framer-motion";
import cardVariants from "./imported-variants";

export function AlwaysRenderedDefaultImportHide() {
  return <motion.div initial="hidden" variants={cardVariants} />;
}
