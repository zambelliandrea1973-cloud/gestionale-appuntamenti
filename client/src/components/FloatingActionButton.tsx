import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  text: string;
}

export function FloatingActionButton({ onClick, text }: FloatingActionButtonProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  
  // Effetto di lampeggiamento
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(prev => !prev);
    }, 1000); // Cambia ogni secondo
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div 
      className="fixed top-[6.5rem] right-6 z-50 transition-all duration-300 ease-in-out shadow-lg"
      style={{ 
        transform: 'scale(1.05)',
        animation: 'pulse 2s infinite'
      }}
    >
      <style>
        {`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
          }
          
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 15px rgba(74, 222, 128, 0);
          }
          
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(74, 222, 128, 0);
          }
        }
        `}
      </style>
      
      <Button
        onClick={onClick}
        size="lg"
        className={`rounded-full transition-all duration-500 ease-in-out flex items-center ${
          isBlinking 
          ? 'bg-green-600 hover:bg-green-700 opacity-100' 
          : 'bg-green-600/50 hover:bg-green-600/70'
        }`}
      >
        <Plus className="mr-2 h-5 w-5" />
        {text}
      </Button>
    </div>
  );
}