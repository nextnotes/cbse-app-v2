import '../styles/globals.css';

export const metadata = {
  title: 'CBSE Vidyasetu — Free CBSE Notes, Mock Tests & Practice for Std 6-10',
  description:
    'Free CBSE study platform for Class 6-10: chapter-wise notes, practice questions, mock tests with instant scoring, mind maps, videos & 3D models for English, Odia, Math, Science, SST & Computer.',
  keywords: [
    'CBSE notes',
    'CBSE class 6 to 10',
    'CBSE mock test',
    'CBSE practice questions',
    'CBSE Odia',
    'CBSE study material',
  ],
  openGraph: {
    title: 'CBSE Vidyasetu — Free CBSE Notes, Mock Tests & Practice',
    description:
      'Chapter-wise notes, mock tests, mind maps, videos & 3D models for CBSE Std 6-10 — English, Odia, Math, Science, SST & Computer.',
    type: 'website',
  },
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
