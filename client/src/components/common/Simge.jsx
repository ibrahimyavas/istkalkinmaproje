import React from 'react';
import clsx from 'clsx';

/** Material Symbols ikonu (tasarımın ikon seti). Süs ikonudur; anlamı yanındaki metin taşır. */
export default function Simge({ ad, boyut = 18, className, style }) {
  return (
    <span className={clsx('simge', className)} style={{ fontSize: boyut, ...style }} aria-hidden="true">
      {ad}
    </span>
  );
}
