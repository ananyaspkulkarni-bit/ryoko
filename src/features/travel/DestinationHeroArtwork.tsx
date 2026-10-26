import React from 'react';

export interface DestinationHeroArtworkProps {
  type?: 'paris' | 'tokyo' | 'mumbai' | 'london' | 'newyork' | 'rome' | 'egypt' | 'generic';
  cityName: string;
}

export const DestinationHeroArtwork: React.FC<DestinationHeroArtworkProps> = ({
  type = 'generic',
  cityName,
}) => {
  return (
    <div
      aria-label={`${cityName} illustrated landscape`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '720px',
        height: '320px',
        margin: 'var(--space-md) 0',
        borderRadius: 'var(--radius-lg)',
        border: '2px dashed var(--color-bamboo)',
        backgroundColor: 'rgba(125, 209, 197, 0.22)',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        boxShadow: 'var(--shadow-postcard)',
      }}
    >
      {/* Subtle Atmospheric Clouds */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '10%',
          width: '120px',
          height: '35px',
          borderRadius: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          filter: 'blur(2px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '40px',
          right: '15%',
          width: '160px',
          height: '45px',
          borderRadius: '25px',
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          filter: 'blur(3px)',
        }}
      />

      {/* Dynamic SVG Artwork per Destination */}
      {type === 'egypt' ? (
        /* EGYPT ARTWORK: Pyramids of Giza + Sphinx + Nile Felucca + Desert Sunset */
        <svg
          width="100%"
          height="auto"
          viewBox="0 0 680 260"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '680px', maxHeight: '260px' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Warm Desert Sun */}
          <circle cx="340" cy="110" r="65" fill="rgba(243, 156, 18, 0.45)" />
          
          {/* Desert Dunes Background */}
          <path d="M0 260 L0 190 Q150 160 300 190 T680 170 L680 260 Z" fill="rgba(211, 84, 0, 0.3)" />
          <path d="M0 260 L0 210 Q200 170 400 210 T680 190 L680 260 Z" fill="rgba(230, 126, 34, 0.35)" />

          {/* Pyramids of Giza Silhouettes */}
          {/* Khafre Pyramid (Left) */}
          <polygon points="210,95 130,220 290,220" fill="var(--color-cypress)" />
          <polygon points="210,95 210,220 290,220" fill="rgba(0, 0, 0, 0.15)" />

          {/* Great Pyramid of Giza (Centerpiece) */}
          <polygon points="340,65 240,220 440,220" fill="var(--color-cypress)" />
          <polygon points="340,65 340,220 440,220" fill="rgba(0, 0, 0, 0.15)" />
          
          {/* Menkaure Pyramid (Right) */}
          <polygon points="450,125 390,220 510,220" fill="var(--color-cypress)" opacity="0.9" />

          {/* Palm Tree Accent */}
          <g transform="translate(100, 145)">
            <path d="M15 75 Q10 35 20 0" stroke="var(--color-cypress)" strokeWidth="4" fill="none" />
            <path d="M20 0 Q5 -15 -10 -5" stroke="var(--color-cypress)" strokeWidth="3" fill="none" />
            <path d="M20 0 Q35 -15 50 -5" stroke="var(--color-cypress)" strokeWidth="3" fill="none" />
            <path d="M20 0 Q20 -25 25 -30" stroke="var(--color-cypress)" strokeWidth="3" fill="none" />
          </g>

          {/* Nile River Promenade & Waves */}
          <rect x="0" y="230" width="680" height="30" fill="var(--color-bright-marine)" opacity="0.25" />
          <path d="M0 230 Q170 220 340 230 T680 230" stroke="var(--color-princeton-orange)" strokeWidth="2" strokeDasharray="6 4" fill="none" />

          {/* Felucca Sail Boat */}
          <g transform="translate(490, 175)">
            <path d="M0 45 L50 45 Q40 55 10 55 Z" fill="var(--color-tomato-jam)" />
            <line x1="25" y1="45" x2="25" y2="5" stroke="var(--color-cypress)" strokeWidth="2" />
            <path d="M25 5 Q50 25 25 45 Z" fill="var(--color-vanilla-custard)" opacity="0.9" />
          </g>
        </svg>
      ) : type === 'tokyo' ? (
        /* TOKYO ARTWORK: Mount Fuji + Torii Gate + Pagoda Spire + Soft Sunset Atmosphere */
        <svg
          width="100%"
          height="auto"
          viewBox="0 0 680 260"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '680px', maxHeight: '260px' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Soft Skyline & Mount Fuji */}
          <polygon points="340,60 180,240 500,240" fill="rgba(217, 130, 141, 0.25)" />
          <polygon points="340,60 300,110 380,110" fill="#FFFFFF" opacity="0.9" />
          
          <path d="M0 260 L0 210 L120 210 L150 180 L220 180 L260 210 L680 210 L680 260 Z" fill="rgba(102, 116, 54, 0.3)" />

          {/* Traditional Pagoda Silhouette (Left) */}
          <g transform="translate(100, 70)">
            <rect x="35" y="0" width="10" height="15" fill="var(--color-cypress)" />
            <path d="M15 15 L65 15 L55 35 L25 35 Z" fill="var(--color-tomato-jam)" />
            <rect x="25" y="35" width="30" height="15" fill="var(--color-cypress)" />
            <path d="M10 50 L70 50 L60 70 L20 70 Z" fill="var(--color-tomato-jam)" />
            <rect x="20" y="70" width="40" height="20" fill="var(--color-cypress)" />
            <path d="M5 90 L75 90 L65 115 L15 115 Z" fill="var(--color-tomato-jam)" />
            <rect x="15" y="115" width="50" height="55" fill="var(--color-cypress)" />
          </g>

          {/* Torii Gate Centerpiece (Right) */}
          <g transform="translate(440, 100)">
            <rect x="10" y="10" width="140" height="12" rx="3" fill="var(--color-tomato-jam)" />
            <rect x="20" y="30" width="120" height="8" rx="2" fill="var(--color-tomato-jam)" />
            <rect x="35" y="30" width="14" height="120" fill="var(--color-cypress)" />
            <rect x="111" y="30" width="14" height="120" fill="var(--color-cypress)" />
            <circle cx="80" cy="21" r="5" fill="var(--color-vanilla-custard)" />
          </g>

          {/* Foreground Cherry Blossom Petal Accents */}
          <circle cx="160" cy="50" r="4" fill="var(--color-blush-rose)" opacity="0.8" />
          <circle cx="220" cy="80" r="6" fill="var(--color-blush-rose)" opacity="0.7" />
          <circle cx="520" cy="65" r="5" fill="var(--color-blush-rose)" opacity="0.8" />
        </svg>
      ) : type === 'mumbai' ? (
        /* MUMBAI ARTWORK: Gateway of India Archway + Arabian Sea + Marigold Atmosphere */
        <svg
          width="100%"
          height="auto"
          viewBox="0 0 680 260"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '680px', maxHeight: '260px' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 260 L0 200 L180 200 L210 170 L300 170 L350 200 L680 200 L680 260 Z" fill="rgba(242, 142, 43, 0.25)" />
          
          {/* Gateway of India Silhouette */}
          <g transform="translate(240, 40)">
            {/* Main Arch Base */}
            <rect x="20" y="50" width="160" height="150" fill="var(--color-cypress)" />
            {/* Central Grand Arch */}
            <path d="M60 200 L60 110 Q100 70 140 110 L140 200 Z" fill="rgba(125, 209, 197, 0.4)" />
            {/* Top Domes & Minarets */}
            <path d="M80 50 Q100 10 120 50 Z" fill="var(--color-princeton-orange)" />
            <rect x="20" y="20" width="16" height="30" fill="var(--color-cypress)" />
            <rect x="164" y="20" width="16" height="30" fill="var(--color-cypress)" />
            <polygon points="20,20 28,5 36,20" fill="var(--color-princeton-orange)" />
            <polygon points="164,20 172,5 180,20" fill="var(--color-princeton-orange)" />
          </g>

          {/* Arabian Sea Waves */}
          <rect x="0" y="235" width="680" height="25" fill="var(--color-bright-marine)" opacity="0.2" />
          <path d="M0 235 Q170 220 340 235 T680 235" stroke="var(--color-princeton-orange)" strokeWidth="2" strokeDasharray="6 4" fill="none" />
        </svg>
      ) : type === 'london' ? (
        /* LONDON ARTWORK: Big Ben / Elizabeth Tower + Thames River */
        <svg
          width="100%"
          height="auto"
          viewBox="0 0 680 260"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '680px', maxHeight: '260px' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 260 L0 190 L160 190 L200 160 L400 160 L440 190 L680 190 L680 260 Z" fill="rgba(102, 116, 54, 0.3)" />

          {/* Big Ben Spire */}
          <g transform="translate(290, 20)">
            <polygon points="40,0 30,40 50,40" fill="var(--color-tomato-jam)" />
            <rect x="25" y="40" width="30" height="30" fill="var(--color-cypress)" />
            <circle cx="40" cy="55" r="8" fill="var(--color-vanilla-custard)" />
            <rect x="20" y="70" width="40" height="150" fill="var(--color-cypress)" />
            <rect x="70" y="110" width="120" height="110" fill="rgba(217, 130, 141, 0.35)" />
          </g>

          <rect x="0" y="235" width="680" height="25" fill="var(--color-bright-marine)" opacity="0.2" />
        </svg>
      ) : type === 'newyork' ? (
        /* NEW YORK ARTWORK: Empire State & Brooklyn Bridge Skyline */
        <svg
          width="100%"
          height="auto"
          viewBox="0 0 680 260"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '680px', maxHeight: '260px' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 260 L0 180 L100 180 L140 130 L180 180 L300 180 L330 40 L360 180 L500 180 L680 180 L680 260 Z" fill="rgba(242, 142, 43, 0.3)" />
          <rect x="342" y="10" width="6" height="30" fill="var(--color-tomato-jam)" />
          <rect x="0" y="235" width="680" height="25" fill="var(--color-bright-marine)" opacity="0.2" />
        </svg>
      ) : type === 'rome' ? (
        /* ROME ARTWORK: Colosseum Archway Silhouette */
        <svg
          width="100%"
          height="auto"
          viewBox="0 0 680 260"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '680px', maxHeight: '260px' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="translate(200, 60)">
            <rect x="0" y="40" width="280" height="150" rx="10" fill="var(--color-cypress)" />
            <path d="M30 190 L30 110 Q50 80 70 110 L70 190 Z" fill="rgba(252, 233, 171, 0.4)" />
            <path d="M110 190 L110 110 Q130 80 150 110 L150 190 Z" fill="rgba(252, 233, 171, 0.4)" />
            <path d="M190 190 L190 110 Q210 80 230 110 L230 190 Z" fill="rgba(252, 233, 171, 0.4)" />
          </g>
          <rect x="0" y="235" width="680" height="25" fill="var(--color-bright-marine)" opacity="0.15" />
        </svg>
      ) : type === 'paris' ? (
        /* PARIS ARTWORK: Eiffel Tower + Seine River */
        <svg
          width="100%"
          height="auto"
          viewBox="0 0 680 260"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '680px', maxHeight: '260px' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M0 260 L0 210 L40 210 L60 190 L90 190 L110 210 L180 210 L200 175 L230 175 L250 210 L300 210 L680 210 L680 260 Z" fill="rgba(102, 116, 54, 0.3)" />
          <path d="M120 260 L120 185 L145 155 L170 185 L220 185 L320 185 L345 130 L370 185 L520 185 L540 160 L570 160 L590 185 L680 185 L680 260 Z" fill="rgba(217, 130, 141, 0.35)" />

          <g transform="translate(310, 10)">
            <line x1="30" y1="0" x2="30" y2="40" stroke="var(--color-cypress)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="30" cy="0" r="3" fill="var(--color-chrysanthemum)" />
            <rect x="23" y="40" width="14" height="6" rx="2" fill="var(--color-cypress)" />
            <polygon points="26,46 34,46 37,110 23,110" fill="var(--color-bright-marine)" />
            <rect x="18" y="110" width="24" height="8" rx="2" fill="var(--color-cypress)" />
            <polygon points="22,118 38,118 52,240 38,240 30,170 22,240 8,240" fill="var(--color-cypress)" />
            <path d="M16 240 Q30 180 44 240" stroke="var(--color-vanilla-custard)" strokeWidth="4" fill="none" />
          </g>

          <rect x="0" y="235" width="680" height="25" fill="var(--color-bright-marine)" opacity="0.15" />
          <path d="M0 235 Q170 225 340 235 T680 235" stroke="var(--color-chrysanthemum)" strokeWidth="2" strokeDasharray="6 4" fill="none" />
        </svg>
      ) : (
        /* GENERIC FALLBACK ARTWORK: Ryoko Illustrated Travel Horizon for any un-templated city/country */
        <svg
          width="100%"
          height="auto"
          viewBox="0 0 680 260"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '680px', maxHeight: '260px' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Warm Sun Rays */}
          <circle cx="340" cy="140" r="70" fill="rgba(252, 233, 171, 0.7)" />
          
          {/* Rolling Travel Hills */}
          <path d="M0 260 L0 180 Q170 120 340 170 T680 150 L680 260 Z" fill="rgba(102, 116, 54, 0.35)" />
          <path d="M0 260 L0 210 Q220 160 440 200 T680 180 L680 260 Z" fill="rgba(217, 130, 141, 0.3)" />

          {/* Flying Paper Plane Path Accent */}
          <path d="M120 180 Q260 80 420 120" stroke="var(--color-princeton-orange)" strokeWidth="2.5" strokeDasharray="6 6" fill="none" />
          <polygon points="425,120 410,112 418,126" fill="var(--color-princeton-orange)" />

          {/* Compass / Location Pin Accent */}
          <g transform="translate(325, 120)">
            <circle cx="15" cy="15" r="14" fill="var(--color-vanilla-custard)" stroke="var(--color-cypress)" strokeWidth="2" />
            <polygon points="15,6 20,15 15,24 10,15" fill="var(--color-tomato-jam)" />
          </g>

          <rect x="0" y="240" width="680" height="20" fill="var(--color-bright-marine)" opacity="0.2" />
        </svg>
      )}
    </div>
  );
};
