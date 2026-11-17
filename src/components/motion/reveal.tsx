import { useState } from "react";
import { motion, type HTMLMotionProps } from "motion/react";

/** Blur-fade-in as a section scrolls into view. Once finished, the blur and GPU hints are removed
 *  so the section costs nothing while you keep scrolling. */
export function Reveal({ delay = 0, y = 40, children, style, onAnimationComplete, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const [done, setDone] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...(style as object), ...(done ? { filter: "none", willChange: "auto" } : { willChange: "transform, opacity, filter" }) }}
      onAnimationComplete={(def) => { setDone(true); onAnimationComplete?.(def); }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function SplitWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em]">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1, delay: delay + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}
