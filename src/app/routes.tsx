import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { GlobeScene } from '../features/globe/GlobeScene';
import { VisualPlayground } from '../features/playground/VisualPlayground';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<GlobeScene />} />
      <Route path="/playground" element={<VisualPlayground />} />
    </Routes>
  );
};
