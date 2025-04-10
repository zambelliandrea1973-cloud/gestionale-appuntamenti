import React from 'react';

interface FleurDeVieProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showAnimation?: boolean;
}

/**
 * Componente che mostra l'icona "Fleur de Vie" con effetto di rotazione al passaggio del mouse
 */
export const FleurDeVie: React.FC<FleurDeVieProps> = ({ 
  size = 'medium',
  className = '',
  showAnimation = false
}) => {
  // Dimensioni basate sul parametro size
  const sizeMap = {
    small: 100,
    medium: 150,
    large: 200
  };
  
  const dimensions = sizeMap[size];
  
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <img 
        src="/attached_assets/Fleur de Vie multicolore.jpg" 
        alt="Fleur de Vie"
        width={dimensions}
        height={dimensions}
        className={`rounded-full ${showAnimation ? 'animate-rotate-in' : ''} hover:rotate-30`}
        style={{ 
          width: `${dimensions}px`, 
          height: `${dimensions}px`,
          objectFit: 'cover'
        }}
      />
    </div>
  );
};

export default FleurDeVie;