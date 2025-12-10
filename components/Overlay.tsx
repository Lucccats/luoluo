import React, { useRef, useState } from 'react';
import { TreeState } from '../types';

interface OverlayProps {
  treeState: TreeState;
  userPhotos: string[];
  isWebcamOn: boolean;
  isMusicOn: boolean;
  onToggleTree: () => void;
  onToggleWebcam: () => void;
  onToggleMusic: () => void;
  onMusicUpload?: (file: File) => void;
  onPhotosUpload?: (files: FileList) => void;
  onRemovePhotos?: (indices: number[]) => void;
}

export const Overlay: React.FC<OverlayProps> = ({ 
  treeState, 
  userPhotos, 
  isWebcamOn,
  isMusicOn,
  onToggleTree, 
  onToggleWebcam,
  onToggleMusic,
  onMusicUpload,
  onPhotosUpload, 
  onRemovePhotos 
}) => {
  const isTree = treeState === TreeState.TREE_SHAPE;
  const photoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  
  // Modal States
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onPhotosUpload) {
      onPhotosUpload(e.target.files);
    }
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onMusicUpload) {
       // Only take the first file
       onMusicUpload(e.target.files[0]);
    }
    if (musicInputRef.current) {
      musicInputRef.current.value = '';
    }
  }

  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndices(newSet);
  };

  const handleDeleteSelected = () => {
    if (onRemovePhotos && selectedIndices.size > 0) {
      onRemovePhotos(Array.from(selectedIndices));
      setSelectedIndices(new Set());
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10 text-white overflow-hidden">
      
      {/* --- Top Bar --- */}
      <div className="absolute top-0 left-0 w-full p-6 md:p-8 flex justify-between items-start">
         {/* Logo */}
         <header className="flex flex-col items-start transition-opacity duration-1000 ease-in-out pointer-events-auto">
          <h1 className="font-serif italic text-xl md:text-xl text-yellow-500 tracking-widest opacity-80">
            YIHON SIGNATURE
          </h1>
          <h2 className="font-serif text-3xl md:text-4xl font-light tracking-tight mt-1 text-left drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">
            The Grand Reveal
          </h2>
        </header>

        {/* Top Right Controls */}
        <div className="pointer-events-auto flex flex-col items-end gap-3 z-50">
            
            {/* Music Controls Group */}
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm p-2 rounded-lg border border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-white/50 hidden md:block mr-1">
                {isMusicOn ? "Sound On" : "Sound Off"}
              </span>
              
              {/* Upload Music Button */}
              <button 
                onClick={() => musicInputRef.current?.click()}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/20 border border-white/10 text-white/70 transition-colors"
                title="Upload Custom Music (MP3)"
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </button>
              <input 
                type="file" 
                ref={musicInputRef} 
                accept="audio/mp3,audio/mpeg,audio/wav,audio/aac" 
                className="hidden" 
                onChange={handleMusicChange}
              />

              {/* Separator */}
              <div className="w-[1px] h-4 bg-white/20 mx-1"></div>

              {/* Toggle Button */}
              <button 
                onClick={onToggleMusic}
                className={`w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${isMusicOn ? 'bg-yellow-600/50 border-yellow-400 text-white' : 'bg-white/10 border-white/20 text-white/50'} border`}
              >
                {isMusicOn ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                )}
              </button>
            </div>

            {/* Webcam Toggle */}
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm p-2 rounded-lg border border-white/10">
              <span className="text-[10px] uppercase tracking-widest text-white/50 hidden md:block">
                {isWebcamOn ? "Camera On" : "Camera Off"}
              </span>
              <button 
                onClick={onToggleWebcam}
                className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors duration-300 ${isWebcamOn ? 'bg-yellow-600/50 border-yellow-400' : 'bg-white/10 border-white/20'} border`}
              >
                <div className={`w-3 h-3 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isWebcamOn ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
            
        </div>
      </div>


      {/* --- Bottom Center: State Feedback & Main Toggle --- */}
      {/* Moved down slightly to be directly below the tree base */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center pointer-events-auto transition-all duration-500 flex flex-col items-center z-20">
          
          {/* Main State Toggle Button */}
          <div className="bg-black/40 backdrop-blur-md p-1 rounded-full border border-yellow-500/30 mb-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <button
              onClick={onToggleTree}
              className="relative group overflow-hidden rounded-full px-8 py-2 md:px-10 md:py-3 transition-all duration-500 min-w-[200px]"
            >
              <div className={`absolute inset-0 transition-opacity duration-500 bg-gradient-to-r from-emerald-900 to-emerald-800 ${isTree ? 'opacity-100' : 'opacity-0'}`} />
              <div className={`absolute inset-0 transition-opacity duration-500 bg-gradient-to-r from-yellow-600 to-yellow-500 ${!isTree ? 'opacity-100' : 'opacity-0'}`} />
              
              <span className="relative z-10 font-serif text-xs md:text-sm tracking-[0.25em] font-bold text-white group-hover:text-yellow-100 transition-colors">
                {isTree ? "SCATTER" : "ASSEMBLE"}
              </span>
            </button>
          </div>
          
          {/* Status Text - Subtle and below the button */}
          <div className="bg-black/20 backdrop-blur-sm px-4 py-1 rounded-full border border-white/5">
            <p className="text-[10px] text-yellow-500/80 tracking-[0.25em] font-sans uppercase">
              Current State: {isTree ? "Festive Form" : "Nebula Chaos"}
            </p>
          </div>
      </div>


      {/* --- Bottom Right: Photo Manager Button --- */}
      <div className="absolute bottom-10 right-10 pointer-events-auto z-20">
        <button 
          onClick={() => setIsGalleryOpen(true)}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full w-14 h-14 md:w-auto md:h-auto md:px-6 md:py-3 md:rounded-full flex items-center justify-center gap-2 group transition-all hover:scale-105 shadow-lg"
        >
          <span className="hidden md:inline text-xs font-sans tracking-widest uppercase">Memories</span>
          <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="absolute -top-1 -right-1 md:static md:bg-white/20 md:px-2 md:py-0.5 md:rounded-full text-[10px] bg-yellow-600 w-5 h-5 flex items-center justify-center rounded-full">
            {userPhotos.length}
          </span>
        </button>
      </div>

      {/* --- Gallery Modal (Reduced Size: 80% approx) --- */}
      {isGalleryOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-lg transition-opacity duration-300 pointer-events-auto p-4">
          {/* Constrained width/height to be "reduced" compared to full screen, approx 80% */}
          <div className="bg-[#0a0f0a] border border-yellow-500/30 rounded-3xl w-[85%] h-[75%] max-w-4xl flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
              <div>
                <h3 className="font-serif text-xl text-yellow-500 tracking-widest">Memory Gallery</h3>
                <p className="text-[10px] text-white/40 font-sans tracking-wide mt-1">SELECT TO DELETE • ADD TO DISPLAY</p>
              </div>
              <button 
                onClick={() => setIsGalleryOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gradient-to-b from-black/20 to-transparent">
              {userPhotos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/30 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                  <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm font-sans tracking-wider mb-2">NO MEMORIES YET</p>
                  <p className="text-xs opacity-60">Upload photos to display on the polaroids</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {userPhotos.map((src, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    return (
                      <button 
                        key={idx} 
                        onClick={() => toggleSelection(idx)}
                        className={`aspect-square relative rounded-xl overflow-hidden border-2 transition-all duration-200 group ${isSelected ? 'border-red-500 opacity-90 scale-95' : 'border-white/10 hover:border-yellow-500/50 hover:scale-[1.02]'}`}
                      >
                        <img src={src} alt={`Memory ${idx}`} className="w-full h-full object-cover" />
                        
                        {/* Hover Overlay */}
                        <div className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${isSelected ? 'hidden' : ''}`}>
                          <span className="text-xs font-sans tracking-wider text-white border border-white/50 px-2 py-1 rounded">SELECT</span>
                        </div>

                        {/* Selected Overlay */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center backdrop-blur-[2px]">
                            <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-md">
              <div className="text-[10px] text-white/40 font-sans tracking-wider">
                {selectedIndices.size} PHOTO{selectedIndices.size !== 1 ? 'S' : ''} SELECTED
              </div>
              
              <div className="flex gap-3">
                 {selectedIndices.size > 0 && (
                    <button 
                      onClick={handleDeleteSelected}
                      className="px-6 py-2 rounded-full bg-red-900/40 border border-red-500/40 text-red-100 text-xs font-sans tracking-widest hover:bg-red-800 transition-colors uppercase shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                    >
                      Delete Selected
                    </button>
                 )}
                 
                 <button 
                   onClick={() => photoInputRef.current?.click()}
                   className="px-6 py-2 rounded-full bg-yellow-600/20 border border-yellow-500/50 text-yellow-200 text-xs font-sans tracking-widest hover:bg-yellow-600/40 transition-colors uppercase shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                 >
                   + Add Photo
                 </button>
                 <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    ref={photoInputRef} 
                    onChange={handlePhotoChange}
                  />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="absolute bottom-6 left-6 hidden md:block text-[10px] text-white/20 font-sans tracking-wide pointer-events-none">
        <p>EST. 2024 • INTERACTIVE 3D EXPERIENCE</p>
      </footer>
    </div>
  );
};