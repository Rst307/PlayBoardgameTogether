import { useState } from 'react';

export function GameArtwork({ src, className, name }: { src: string | null; className: string; name: string }) {
  return <ArtworkImage key={src} src={src} className={className} name={name} />;
}

function ArtworkImage({ src, className, name }: { src: string | null; className: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={className}>
    {src && !failed
      ? <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <span className="game-art-fallback" aria-label="展示图片不可用">{name.slice(0, 1)}</span>}
  </div>;
}
