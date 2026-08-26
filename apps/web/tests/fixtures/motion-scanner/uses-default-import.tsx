import { motion } from "framer-motion";
import fadeVariants from "./imported-variants";

export function AlwaysRenderedDefaultImportHide() {
  return <motion.div initial="hidden" variants={fadeVariants} />;
}
