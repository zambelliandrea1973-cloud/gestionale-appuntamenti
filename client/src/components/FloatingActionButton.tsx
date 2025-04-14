import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface FloatingActionButtonProps {
  onClick: () => void;
  text: string;
  variant?: 'primary' | 'secondary';
}

export function FloatingActionButton({ onClick, text, variant = 'primary' }: FloatingActionButtonProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  
  // Effetto di lampeggiamento
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(prev => !prev);
    }, 1000); // Cambia ogni secondo
    
    return () => clearInterval(interval);
  }, []);
  
  // Colori per le diverse varianti
  const colorClasses = {
    primary: {
      active: 'bg-green-600 hover:bg-green-700 opacity-100',
      inactive: 'bg-green-600/50 hover:bg-green-600/70',
      shadowColor: 'rgba(74, 222, 128, 0.7)',
      shadowColorFade: 'rgba(74, 222, 128, 0)'
    },
    secondary: {
      active: 'bg-gray-500 hover:bg-gray-600 opacity-100',
      inactive: 'bg-gray-500/50 hover:bg-gray-500/70',
      shadowColor: 'rgba(156, 163, 175, 0.7)',
      shadowColorFade: 'rgba(156, 163, 175, 0)'
    }
  };
  
  const selectedColors = colorClasses[variant];
  
  return (
    <div 
      className="fixed top-[13rem] right-6 z-50 transition-all duration-300 ease-in-out shadow-lg"
      style={{ 
        transform: 'scale(1.05)',
        animation: variant === 'primary' ? 'pulse 2s infinite' : undefined
      }}
    >
      <style>
        {`
        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 ${selectedColors.shadowColor};
          }
          
          70% {
            transform: scale(1.05);
            box-shadow: 0 0 0 15px ${selectedColors.shadowColorFade};
          }
          
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 ${selectedColors.shadowColorFade};
          }
        }
        `}
      </style>
      
      <Button
        onClick={onClick}
        size="lg"
        className={`rounded-full transition-all duration-500 ease-in-out flex items-center ${
          isBlinking 
          ? selectedColors.active 
          : selectedColors.inactive
        }`}
      >
        {variant === 'primary' ? (
          <Plus className="mr-2 h-5 w-5" />
        ) : (
          <X className="mr-2 h-5 w-5" />
        )}
        {text}
      </Button>
    </div>
  );
}