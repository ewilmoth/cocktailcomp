import { useEffect, useRef } from 'react';

const API_LOAD_TIMEOUT_MS = 8000;

let apiPromise = null;
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        apiPromise = null;
        reject(new Error('YouTube failed to load'));
      };
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      document.head.appendChild(script);
    });
  }
  return apiPromise;
}

// Plays the video in the page and calls onDone when it finishes. If YouTube
// can't load or refuses to embed it, onDone fires straight away so nobody is
// stuck in front of a broken player.
export default function YouTubeGate({ videoId, onDone }) {
  const mountRef = useRef(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let player = null;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      doneRef.current();
    };
    const timeout = setTimeout(finish, API_LOAD_TIMEOUT_MS);

    loadYouTubeApi()
      .then((YT) => {
        clearTimeout(timeout);
        if (finished || !mountRef.current) return;
        // YouTube replaces the element it's given with an iframe, so hand it
        // one React doesn't track.
        const target = document.createElement('div');
        mountRef.current.appendChild(target);
        player = new YT.Player(target, {
          videoId,
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onStateChange: (e) => e.data === YT.PlayerState.ENDED && finish(),
            onError: finish,
          },
        });
      })
      .catch(() => {
        clearTimeout(timeout);
        finish();
      });

    const mount = mountRef.current;
    return () => {
      finished = true;
      clearTimeout(timeout);
      player?.destroy?.();
      mount?.replaceChildren();
    };
  }, [videoId]);

  return <div className="video-frame" ref={mountRef} />;
}
