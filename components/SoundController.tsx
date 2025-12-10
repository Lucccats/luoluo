import React, { useEffect, useRef } from 'react';
import { TreeState } from '../types';
import { BG_MUSIC_URL } from '../constants';

interface SoundControllerProps {
  treeState: TreeState;
}

export const SoundController: React.FC<SoundControllerProps> = ({ treeState }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize Audio
    // NOTE: We do NOT set crossOrigin here. 
    // Since we are only playing the audio and not analyzing it with Web Audio API,
    // omitting crossOrigin allows us to play 'opaque' responses from servers that 
    // might not send strict CORS headers, fixing the "no supported source" error.
    const audio = new Audio();
    audio.src = BG_MUSIC_URL;
    audio.loop = true;
    audio.volume = 0; // Start muted for fade-in
    audio.preload = 'auto';

    // Debug listeners
    audio.addEventListener('canplaythrough', () => console.log("Audio ready to play"));
    audio.addEventListener('error', (e) => {
        const target = e.target as HTMLAudioElement;
        console.warn("Audio error code:", target.error?.code, target.error?.message);
    });
    audio.addEventListener('play', () => console.log("Audio started playing"));

    audioRef.current = audio;

    // Browser Autoplay Policy Helper:
    // Many browsers require a user interaction *before* any audio can play.
    const unlockAudio = () => {
      if (audioRef.current) {
        // Just load to prime the element
        audioRef.current.load();
        console.log("Audio context unlocked via user interaction");
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Logic: If state is TREE_SHAPE, ensure music is playing.
    if (treeState === TreeState.TREE_SHAPE) {
      // Clear any existing fade interval
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);

      // Only start if not already playing
      if (audio.paused) {
        console.log("Attempting to play audio...");
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Fade In Logic
              let vol = audio.volume;
              const targetVol = 0.5;
              
              fadeIntervalRef.current = window.setInterval(() => {
                if (vol < targetVol) {
                  vol = Math.min(targetVol, vol + 0.05); // Faster fade in for responsiveness
                  audio.volume = vol;
                } else {
                  if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
                }
              }, 200);
            })
            .catch((error) => {
              console.warn("Autoplay blocked. Waiting for explicit interaction.", error);
              // Fallback: Bind a forced play to the next click
              const forcePlay = () => {
                audio.play();
                audio.volume = 0.5;
                window.removeEventListener('click', forcePlay);
              };
              window.addEventListener('click', forcePlay, { once: true });
            });
        }
      }
    } else {
      // Optional: Pause when scattered? 
      // Current design: Keep playing once started for ambiance
    }
  }, [treeState]);

  return null;
};