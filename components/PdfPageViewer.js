'use client';

import { useEffect, useRef, useState } from 'react';

export default function PdfPageViewer({ url }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setLoading(true);
      setError('');
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;

        const container = containerRef.current;
        if (container) container.innerHTML = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';
          canvas.style.marginBottom = '14px';
          canvas.style.borderRadius = '10px';
          canvas.style.border = '1px solid #e5e9f0';

          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          if (container) container.appendChild(canvas);
        }
      } catch (err) {
        if (!cancelled) setError("Couldn't load this document: " + err.message);
      }
      if (!cancelled) setLoading(false);
    }

    if (url) render();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return null;

  return (
    <div>
      {loading && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading pages...</p>}
      {error && <p style={{ color: '#e0645a', fontSize: 13 }}>{error}</p>}
      <div
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      />
    </div>
  );
}
