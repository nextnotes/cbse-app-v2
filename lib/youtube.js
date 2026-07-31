export function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    let videoId = null;

    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1);
    } else if (u.hostname.includes('youtube.com')) {
      if (u.pathname === '/watch') {
        videoId = u.searchParams.get('v');
      } else if (u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/embed/')[1];
      } else if (u.pathname.startsWith('/shorts/')) {
        videoId = u.pathname.split('/shorts/')[1];
      }
    }

    if (!videoId) return null;
    videoId = videoId.split('&')[0].split('?')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}
