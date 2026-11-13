import React from 'react';
import { Link } from 'react-router-dom';

export default function BulunamadiSayfasi() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="font-display text-7xl font-bold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold">Bu sokak çıkmaz çıktı.</h1>
      <p className="mt-2 text-ink-muted">Aradığınız sayfa bulunamadı. Ama İstanbul'da kaybolmak da bir keşiftir.</p>
      <Link to="/" className="btn-ana mt-6">Semtlere dön</Link>
    </div>
  );
}
