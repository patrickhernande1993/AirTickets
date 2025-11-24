
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  // Definição do Hexágono (Pointy topped)
  // Pontos aproximados para um hexágono regular
  const hexPoints = "50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25";
  
  // Cores extraídas visualmente da logo (Gradiente do vinho para o laranja)
  const colors = [
    "#7f1d1d", // Dark Red
    "#991b1b", 
    "#b91c1c", 
    "#dc2626", 
    "#ef4444", 
    "#f87171", 
    "#fb923c"  // Orange
  ];

  // Grid de posições para formar o cluster de 19 hexágonos
  // Ajustado para caber em viewBox 0 0 400 400
  // Colunas: 3, 4, 5, 4, 3
  const hexRadius = 28;
  const xStep = 44; // Distância horizontal
  const yStep = 52; // Distância vertical

  const grid = [
    // Coluna 1 (Esquerda) - 3 hex
    { x: 50, y: 100, c: colors[0] },
    { x: 50, y: 200, c: colors[1] },
    { x: 50, y: 300, c: colors[2] },
    
    // Coluna 2 - 4 hex
    { x: 125, y: 50, c: colors[0] },
    { x: 125, y: 150, c: colors[1] },
    { x: 125, y: 250, c: colors[2] },
    { x: 125, y: 350, c: colors[3] },

    // Coluna 3 (Meio) - 5 hex
    { x: 200, y: 0, c: colors[1] },
    { x: 200, y: 100, c: colors[2] },
    { x: 200, y: 200, c: colors[3] },
    { x: 200, y: 300, c: colors[4] },
    { x: 200, y: 400, c: colors[5] },

    // Coluna 4 - 4 hex
    { x: 275, y: 50, c: colors[2] },
    { x: 275, y: 150, c: colors[3] },
    { x: 275, y: 250, c: colors[4] },
    { x: 275, y: 350, c: colors[5] },

    // Coluna 5 (Direita) - 3 hex
    { x: 350, y: 100, c: colors[4] },
    { x: 350, y: 200, c: colors[5] },
    { x: 350, y: 300, c: colors[6] },
  ];

  return (
    <svg 
      viewBox="0 -30 400 460" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        {grid.map((h, i) => (
          <polygon
            key={i}
            points={hexPoints}
            fill={h.c}
            transform={`translate(${h.x}, ${h.y}) scale(0.5)`}
          />
        ))}
      </g>
    </svg>
  );
};
