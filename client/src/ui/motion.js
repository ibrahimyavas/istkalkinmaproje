// Hareket ön ayarları (Yula'dan alındı).
export const spring = { type: 'spring', stiffness: 260, damping: 24, mass: 0.9 };
export const springSnappy = { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 };

export const stagger = (index) => ({ ...spring, delay: Math.min(index * 0.05, 0.35) });

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const press = { scale: 0.97, transition: springSnappy };
