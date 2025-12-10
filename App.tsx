import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Experience } from './components/Experience';
import { Overlay } from './components/Overlay';
import { HandTracker } from './components/HandTracker';
import { TreeState, HandGesture, HandData } from './types';
import { BG_MUSIC_URL } from './constants';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.SCATTERED);
  const [handData, setHandData] = useState<HandData>({ 
    gesture: HandGesture.NONE, 
    position: { x: 0, y: 0 }, 
    isDetected: false 
  });
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [isWebcamOn, setIsWebcamOn] = useState(true);
  
  // Audio State
  const [isMusicOn, setIsMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Store the current music source URL (Initialized with constant)
  const [currentMusicSrc, setCurrentMusicSrc] = useState<string>(BG_MUSIC_URL);

  // Initialize Audio Logic
  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      audioRef.current.preload = 'auto';
      
      audioRef.current.addEventListener('error', (e) => {
        console.error("Audio Load Error:", audioRef.current?.error);
      });
    }

    const audio = audioRef.current;
    
    // Only update src if we actually have a source URL and it's different
    if (currentMusicSrc && audio.src !== currentMusicSrc) {
        const wasPlaying = !audio.paused;
        audio.src = currentMusicSrc;
        
        // If it was already playing (e.g. user replaced track while playing), keep playing
        // But do NOT auto-play on initial load.
        if (wasPlaying) {
             audio.play()
                .then(() => setIsMusicOn(true))
                .catch(e => console.warn("Resume failed", e));
        }
    }

    return () => {
      // Cleanup happens only on unmount
    };
  }, [currentMusicSrc]);

  // Handle Music Toggle (Manual Click)
  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (!currentMusicSrc) {
        alert("No music loaded.");
        return;
    }

    if (isMusicOn) {
      audioRef.current.pause();
      setIsMusicOn(false);
    } else {
      audioRef.current.play()
        .then(() => setIsMusicOn(true))
        .catch(error => {
            console.warn("Playback prevented:", error);
            setIsMusicOn(false);
        });
    }
  };

  // Handle User Uploading Custom Music
  const handleMusicUpload = (file: File) => {
    if (file) {
        const objectUrl = URL.createObjectURL(file);
        setCurrentMusicSrc(objectUrl);
        
        // Optional: Auto-play immediately upon upload if desired, 
        // or wait for interaction. Let's play immediately for feedback.
        if (audioRef.current) {
            audioRef.current.src = objectUrl;
            audioRef.current.play()
                .then(() => setIsMusicOn(true))
                .catch(() => {});
        }
    }
  };

  // Logic to play music automatically when Switching States
  const toggleState = () => {
    // Trigger Music if it's not playing yet
    if (!isMusicOn && audioRef.current && currentMusicSrc) {
       const playPromise = audioRef.current.play();
       if (playPromise !== undefined) {
         playPromise.then(() => setIsMusicOn(true)).catch(() => {});
       }
    }

    setTreeState(prev => 
      prev === TreeState.TREE_SHAPE ? TreeState.SCATTERED : TreeState.TREE_SHAPE
    );
  };

  const handleHandUpdate = useCallback((data: HandData) => {
    setHandData(data);
    
    if (data.gesture === HandGesture.OPEN) {
      if (treeState !== TreeState.SCATTERED) {
          setTreeState(TreeState.SCATTERED);
          // Ensure music plays on interaction
          if (!isMusicOn && audioRef.current && currentMusicSrc) {
            audioRef.current.play().then(() => setIsMusicOn(true)).catch(() => {});
          }
      }
    } else if (data.gesture === HandGesture.CLOSED) {
      if (treeState !== TreeState.TREE_SHAPE) {
          setTreeState(TreeState.TREE_SHAPE);
          // Ensure music plays on interaction
          if (!isMusicOn && audioRef.current && currentMusicSrc) {
            audioRef.current.play().then(() => setIsMusicOn(true)).catch(() => {});
          }
      }
    }
  }, [isMusicOn, currentMusicSrc, treeState]);

  const handlePhotosUpload = (files: FileList) => {
    const urls: string[] = [];
    Array.from(files).forEach(file => {
      urls.push(URL.createObjectURL(file));
    });
    setUserPhotos(prev => [...prev, ...urls]);
  };

  const handleRemovePhotos = (indicesToRemove: number[]) => {
    const newPhotos = userPhotos.filter((_, i) => !indicesToRemove.includes(i));
    indicesToRemove.forEach(index => {
      if (userPhotos[index]) URL.revokeObjectURL(userPhotos[index]);
    });
    setUserPhotos(newPhotos);
  };

  return (
    <div className="relative w-full h-full bg-[#000502]">
      <HandTracker onHandUpdate={handleHandUpdate} isEnabled={isWebcamOn} />
      
      <Experience treeState={treeState} handData={handData} userPhotos={userPhotos} />
      <Overlay 
        treeState={treeState} 
        userPhotos={userPhotos}
        isWebcamOn={isWebcamOn}
        isMusicOn={isMusicOn}
        onToggleTree={toggleState}
        onToggleWebcam={() => setIsWebcamOn(prev => !prev)}
        onToggleMusic={toggleMusic}
        onMusicUpload={handleMusicUpload}
        onPhotosUpload={handlePhotosUpload} 
        onRemovePhotos={handleRemovePhotos}
      />
    </div>
  );
};

export default App;