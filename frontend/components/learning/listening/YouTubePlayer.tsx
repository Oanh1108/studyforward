"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  onReady?: (player: any) => void;
  onStateChange?: (state: number) => void;
  onError?: (error: number) => void;
}

export function YouTubePlayer({ videoId, onReady, onStateChange, onError }: YouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsApiLoaded(true);
      };
    } else {
      setIsApiLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isApiLoaded && containerRef.current && !playerRef.current) {
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event: any) => {
            if (onReady) onReady(event.target);
          },
          onStateChange: (event: any) => {
            if (onStateChange) onStateChange(event.data);
          },
          onError: (event: any) => {
            if (onError) onError(event.data);
          }
        }
      });
    }

    return () => {
      // Don't destroy on unmount to prevent iframe flickering if it's reused,
      // but if videoId changes, we load new video.
    };
  }, [isApiLoaded]); // Intentionally not including videoId here to only init once

  useEffect(() => {
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
    }
  }, [videoId]);

  return <div ref={containerRef} className="w-full h-full bg-black rounded-xl overflow-hidden aspect-video"></div>;
}
