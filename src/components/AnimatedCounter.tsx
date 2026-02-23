import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  className?: string;
}

const AnimatedCounter = ({ value, className }: AnimatedCounterProps) => {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const prevValue = useRef(value);

  useEffect(() => {
    spring.set(value);
    prevValue.current = value;
  }, [value, spring]);

  return (
    <motion.span className={className}>
      {display}
    </motion.span>
  );
};

export default AnimatedCounter;
