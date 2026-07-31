'use client';

export default function Model3DViewer({ src, alt }) {
  if (!src) {
    return (
      <p style={{ color: '#6b7280' }}>
        No 3D model uploaded for this chapter yet.
      </p>
    );
  }

  return (
    // model-viewer is a web component loaded via <script> in app/layout.js
    // eslint-disable-next-line react/no-unknown-property
    <model-viewer
      src={src}
      alt={alt || '3D model'}
      auto-rotate
      camera-controls
      style={{ width: '100%', height: '360px', borderRadius: '12px', background: '#f0f2f6' }}
    ></model-viewer>
  );
}
