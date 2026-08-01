import '../styles/globals.css';

export const metadata = {
  title: 'CBSE Vidyasetu — Std 6-10',
  description: 'Notes, practice sets, mind maps & 3D models for CBSE Std 6-10',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Powers the <model-viewer> tag used for the 3D module viewer */}
        <script
          type="module"
          src="https://cdnjs.cloudflare.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
        ></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
