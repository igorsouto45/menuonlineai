import { useCallback, useRef } from 'react';

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playNotification = useCallback(() => {
    try {
      // Create audio element with a notification sound (using Web Audio API beep as fallback)
      if (!audioRef.current) {
        audioRef.current = new Audio();
        // Base64 encoded notification beep sound
        audioRef.current.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVkUJIHO6teleVkUJIHO6smpXhkYZ6nc5KheFSBdpdb0mIheAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVkUJIHO6teleVkUJIHO6smpXhkYZ6nc5KheFSBdpdb0mIheAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVkUJIHO6teleVkUJIHO6smpXhkYZ6nc5KheFSBdpdb0mIhe';
      }
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {
        // Fallback: use Web Audio API for a simple beep
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      });
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, []);

  return { playNotification };
}
