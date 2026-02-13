
import React, { useState, useRef } from 'react';
import { Button } from './Button';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string, audioBlob: Blob) => void;
  isLoading: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscriptionComplete, isLoading }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64String = reader.result?.toString().split(',')[1];
          if (base64String) {
            // We pass the blob for local playback if needed and text comes from Gemini
            onTranscriptionComplete(base64String, audioBlob);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Erreur: Impossible d'accéder au micro.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50">
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <Button 
            onClick={startRecording} 
            isLoading={isLoading}
            className="rounded-full w-16 h-16 flex items-center justify-center p-0 shadow-lg hover:scale-105"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </Button>
        ) : (
          <Button 
            onClick={stopRecording} 
            variant="danger"
            className="rounded-full w-16 h-16 flex items-center justify-center p-0 animate-pulse shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
          </Button>
        )}
      </div>
      <p className="text-sm font-medium text-indigo-700">
        {isRecording ? "Enregistrement en cours..." : isLoading ? "Transcription par Gemini..." : "Appuyez pour parler"}
      </p>
    </div>
  );
};
