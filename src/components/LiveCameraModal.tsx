import React, { useState, useRef, useEffect } from 'react';
import { Camera, RotateCw, X, Check, AlertCircle, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturePhoto: (dataUrl: string, fileName: string) => void;
  onOpenNativeCamera: () => void;
}

export const LiveCameraModal: React.FC<LiveCameraModalProps> = ({
  isOpen,
  onClose,
  onCapturePhoto,
  onOpenNativeCamera
}) => {
  const { isDayMode } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen || capturedPhoto) return;

    let currentStream: MediaStream | null = null;
    setIsInitializing(true);
    setCameraError(null);

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera stream not supported in this browser.');
        }

        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        currentStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err: any) {
        console.warn('Live camera error:', err);
        setCameraError(
          err.message || 'Unable to access live camera stream. You can use your mobile camera app.'
        );
      } finally {
        setIsInitializing(false);
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode, capturedPhoto]);

  // Clean up on close
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCapturedPhoto(null);
    onClose();
  };

  const handleFlipCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, flip horizontally for mirror effect
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);

    // Stop live stream while reviewing photo
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleConfirmSend = () => {
    if (!capturedPhoto) return;
    const fileName = `camera_photo_${Date.now()}.jpg`;
    onCapturePhoto(capturedPhoto, fileName);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md h-[80vh] max-h-[640px] bg-slate-950 rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
        {/* Top Camera Bar */}
        <div className="h-12 px-4 flex items-center justify-between z-20 text-white shrink-0 bg-gradient-to-b from-black/80 to-transparent">
          <span className="text-xs font-bold tracking-wider uppercase opacity-80 flex items-center space-x-1.5">
            <Camera className="w-4 h-4 text-rose-500" />
            <span>Live Camera</span>
          </span>
          <div className="flex items-center space-x-2">
            {!capturedPhoto && !cameraError && (
              <button
                type="button"
                onClick={handleFlipCamera}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Flip Camera"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close Camera"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {capturedPhoto ? (
            /* Captured Snapshot Preview */
            <img
              src={capturedPhoto}
              alt="Snapshot"
              className="w-full h-full object-contain"
            />
          ) : cameraError ? (
            /* Camera Permission / Access Fallback */
            <div className="p-6 text-center text-white space-y-4 max-w-xs">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <p className="text-xs opacity-80 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenNativeCamera();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                Open Phone Camera App
              </button>
            </div>
          ) : (
            /* Live Camera Stream */
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-xs font-semibold">
                  Starting camera...
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Shutter Controls */}
        <div className="h-24 px-6 flex items-center justify-between shrink-0 bg-gradient-to-t from-black to-transparent z-20">
          {capturedPhoto ? (
            /* Retake / Send actions */
            <div className="w-full flex items-center justify-between space-x-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Send Photo</span>
              </button>
            </div>
          ) : (
            /* Live Shutter Button & Native Fallback */
            <div className="w-full flex items-center justify-around">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenNativeCamera();
                }}
                className="text-white/70 hover:text-white text-xs font-semibold underline underline-offset-4 cursor-pointer"
              >
                Native App
              </button>

              {/* Shutter Circle */}
              <button
                type="button"
                onClick={handleTakeSnapshot}
                disabled={Boolean(cameraError) || isInitializing}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center cursor-pointer transition-transform active:scale-90 disabled:opacity-40"
                title="Take Photo"
              >
                <div className="w-12 h-12 rounded-full bg-rose-600" />
              </button>

              <div className="w-16" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
