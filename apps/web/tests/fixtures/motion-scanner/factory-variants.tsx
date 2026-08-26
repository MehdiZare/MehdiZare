import { motion } from "framer-motion";
import type { Variants } from "framer-motion";

// A `variants=` binding the scanner cannot inline. The production scan must
// report it rather than pass, or a real `variants={createVariants(...)}` in a
// component would ship a hiding initial unseen.
function createVariants(input: Variants): Variants {
  return input;
}

const cardVariants = createVariants({ hidden: { opacity: 0 } });

export function FactoryVariantsFixture() {
  return <motion.div initial="hidden" variants={cardVariants} />;
}
