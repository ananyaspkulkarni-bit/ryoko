import React from 'react';
import type { AanExpression, AanOutfit } from './aan.types';

export interface AanCharacterSvgProps {
  expression?: AanExpression;
  outfit?: AanOutfit;
  width?: number;
  height?: number;
}

export const AanCharacterSvg: React.FC<AanCharacterSvgProps> = ({
  expression = 'happy',
  outfit = 'base',
  width = 170,
  height = 150,
}) => {
  // Color palette constants for hand-drawn character rendering
  const hairDark = '#3A2215';
  const hairMid = '#4E3120';
  const strokeColor = '#3D2517'; // Warm dark organic outline (no harsh black)
  const skinBase = '#FDEED9';
  const blushColor = 'var(--color-blush-rose)';
  const eyeDark = '#2B160B';
  const eyeIris = '#56331D';

  // Eye & Eyelash Rendering per Expression (Inspired by Reference Image 2)
  const renderEyes = () => {
    switch (expression) {
      case 'excited':
        return (
          <g id="EyesExcited">
            {/* Curved Happy Arch Eyes (^ ^) with Fan Lashes */}
            <path d="M74 46 Q81 37 88 46" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M96 46 Q103 37 110 46" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Lash flicks */}
            <path d="M74 44 L70 41 M72 41 L70 37 M88 44 L92 41 M90 41 L92 37" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            <path d="M96 44 L92 41 M94 41 L92 37 M110 44 L114 41 M112 41 L114 37" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
          </g>
        );

      case 'curious':
        return (
          <g id="EyesCurious">
            {/* Left Eye */}
            <ellipse cx="81" cy="46" rx="6.5" ry="8" fill={eyeDark} />
            <circle cx="81" cy="46" r="4.5" fill={eyeIris} opacity="0.6" />
            <circle cx="83.5" cy="43.5" r="2.8" fill="#FFFFFF" />
            <circle cx="79" cy="49" r="1.3" fill="#FFFFFF" opacity="0.9" />

            {/* Right Eye (Slightly Wider for Inquisitive Curiosity) */}
            <ellipse cx="103" cy="45" rx="7.5" ry="9" fill={eyeDark} />
            <circle cx="103" cy="45" r="5" fill={eyeIris} opacity="0.6" />
            <circle cx="106" cy="42" r="3.2" fill="#FFFFFF" />
            <circle cx="101" cy="48.5" r="1.5" fill="#FFFFFF" opacity="0.9" />

            {/* Eyelash Fan Radiating Outwards */}
            <path d="M73 42 Q81 37 89 42" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M94 40 Q103 35 112 41" stroke={strokeColor} strokeWidth="2.8" strokeLinecap="round" fill="none" />
            <path d="M73 41 L69 37 M76 39 L74 34 M112 40 L116 36 M109 38 L111 33" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" />
          </g>
        );

      case 'surprised':
        return (
          <g id="EyesSurprised">
            {/* Wide Round Eyes (o o) */}
            <circle cx="81" cy="46" r="7.5" fill={eyeDark} />
            <circle cx="103" cy="46" r="7.5" fill={eyeDark} />
            <circle cx="83.5" cy="43" r="3" fill="#FFFFFF" />
            <circle cx="105.5" cy="43" r="3" fill="#FFFFFF" />
            <path d="M73 42 Q81 38 89 42" stroke={strokeColor} strokeWidth="2.2" fill="none" />
            <path d="M95 42 Q103 38 111 42" stroke={strokeColor} strokeWidth="2.2" fill="none" />
          </g>
        );

      case 'playful':
        return (
          <g id="EyesPlayful">
            {/* Left Winking Eye */}
            <path d="M75 47 Q81 40 87 47" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" fill="none" />
            <line x1="74" y1="46" x2="70" y2="43" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="88" y1="46" x2="92" y2="43" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />

            {/* Right Open Eye */}
            <ellipse cx="103" cy="46" rx="7.2" ry="8.5" fill={eyeDark} />
            <circle cx="103" cy="46" r="4.8" fill={eyeIris} opacity="0.6" />
            <circle cx="105.8" cy="43" r="3" fill="#FFFFFF" />
            <circle cx="100.5" cy="49" r="1.4" fill="#FFFFFF" opacity="0.9" />
            <path d="M95 41 Q103 36 111 41" stroke={strokeColor} strokeWidth="2.5" fill="none" />
          </g>
        );

      case 'happy':
      default:
        return (
          <g id="EyesStorybookSignature">
            {/* Left Eye Iris & Pupil */}
            <ellipse cx="81" cy="46" rx="7.2" ry="8.5" fill={eyeDark} />
            <ellipse cx="81" cy="46" rx="4.8" ry="5.8" fill={eyeIris} opacity="0.6" />
            {/* Left Eye Sparkle Highlights */}
            <circle cx="83.8" cy="43" r="3" fill="#FFFFFF" />
            <circle cx="78.8" cy="49" r="1.4" fill="#FFFFFF" opacity="0.9" />

            {/* Right Eye Iris & Pupil */}
            <ellipse cx="103" cy="46" rx="7.2" ry="8.5" fill={eyeDark} />
            <ellipse cx="103" cy="46" rx="4.8" ry="5.8" fill={eyeIris} opacity="0.6" />
            {/* Right Eye Sparkle Highlights */}
            <circle cx="105.8" cy="43" r="3" fill="#FFFFFF" />
            <circle cx="100.8" cy="49" r="1.4" fill="#FFFFFF" opacity="0.9" />

            {/* Top Eyelash Outlines & Radiating Lashes (Exact Reference Image 2 Style) */}
            <path d="M73 42 Q81 37 89 42" stroke={strokeColor} strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M95 42 Q103 37 111 42" stroke={strokeColor} strokeWidth="2.6" strokeLinecap="round" fill="none" />

            {/* Top Lashes Fanning Outward */}
            <line x1="73" y1="41" x2="69" y2="37" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="75" y1="39" x2="72" y2="34" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="78" y1="38" x2="77" y2="33" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" />

            <line x1="111" y1="41" x2="115" y2="37" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="109" y1="39" x2="112" y2="34" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="106" y1="38" x2="107" y2="33" stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" />

            {/* Subtle Lower Lashes */}
            <line x1="75" y1="52" x2="72" y2="55" stroke={strokeColor} strokeWidth="1.3" opacity="0.75" strokeLinecap="round" />
            <line x1="78" y1="53" x2="76" y2="56" stroke={strokeColor} strokeWidth="1.3" opacity="0.75" strokeLinecap="round" />
            <line x1="109" y1="52" x2="112" y2="55" stroke={strokeColor} strokeWidth="1.3" opacity="0.75" strokeLinecap="round" />
            <line x1="106" y1="53" x2="108" y2="56" stroke={strokeColor} strokeWidth="1.3" opacity="0.75" strokeLinecap="round" />
          </g>
        );
    }
  };

  // Eyebrows
  const renderEyebrows = () => {
    switch (expression) {
      case 'curious':
        return (
          <g stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M75 35 Q81 33 87 36" />
            <path d="M97 33 Q103 29 109 34" />
          </g>
        );
      default:
        return (
          <g stroke={strokeColor} strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M75 35 Q81 33 87 35" />
            <path d="M97 35 Q103 33 109 35" />
          </g>
        );
    }
  };

  // Mouth
  const renderMouth = () => {
    switch (expression) {
      case 'excited':
        return (
          <path d="M87 56 Q92 63 97 56 Z" fill="var(--color-chrysanthemum)" stroke={strokeColor} strokeWidth="1.4" />
        );
      case 'playful':
        return (
          <path d="M86 55 Q92 61 98 54" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" fill="none" />
        );
      case 'surprised':
        return (
          <ellipse cx="92" cy="56" rx="2.5" ry="3.5" fill={strokeColor} />
        );
      default:
        return (
          <path d="M88 55 Q92 59 96 55" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        );
    }
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 180 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: 'visible' }}
    >
      {/* Soft Shadow beneath Seated Aan & Airplane */}
      <ellipse cx="90" cy="148" rx="68" ry="10" fill="rgba(61, 43, 31, 0.12)" />

      {/* 
        ==================================================
        PART 1: AAN CHARACTER (SEATED ON PAPER PLANE)
        Exact visual identity matching Reference Image 2
        ==================================================
      */}
      <g id="AanCharacter">
        {/* Soft Fluffy Wavy Dark Brown Hair Backing */}
        <path
          d="M62 34 C54 14 130 14 122 34 C132 50 126 74 112 77 C96 80 68 77 60 70 C52 54 54 42 62 34 Z"
          fill={hairDark}
        />

        {/* Outer Fluffy Hair Waves & Volume (Matching Reference Image 2 Bob) */}
        <path d="M58 40 Q48 54 58 66 Q66 74 76 72 Q62 62 58 40 Z" fill={hairMid} />
        <path d="M126 40 Q136 54 126 66 Q118 74 108 72 Q122 62 126 40 Z" fill={hairMid} />
        {/* Hand-drawn texture locks */}
        <path d="M54 48 C50 56 56 64 62 68" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
        <path d="M130 48 C134 56 128 64 122 68" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />

        {/* Silver Hoop Earrings (Matching Reference Image 2) */}
        <ellipse cx="64" cy="56" rx="3" ry="5" fill="none" stroke="#E2E2E2" strokeWidth="1.8" />
        <ellipse cx="120" cy="56" rx="3" ry="5" fill="none" stroke="#E2E2E2" strokeWidth="1.8" />

        {/* Chibi Head (Warm Storybook Skin Tone) */}
        <path
          d="M70 38 C70 24 114 24 114 38 C114 56 108 67 92 67 C76 67 70 56 70 38 Z"
          fill={skinBase}
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Soft Rosy Blush Wash across Cheeks & Nose (Matching Reference Image 2) */}
        <ellipse cx="75" cy="52" rx="6.5" ry="4.5" fill={blushColor} opacity="0.55" />
        <ellipse cx="109" cy="52" rx="6.5" ry="4.5" fill={blushColor} opacity="0.55" />
        <ellipse cx="92" cy="53" rx="8" ry="3" fill={blushColor} opacity="0.38" />

        {/* Subtle Delicate Freckle Dots (Matching Reference Image 2) */}
        <circle cx="73" cy="52" r="0.65" fill="#6B4436" opacity="0.65" />
        <circle cx="76" cy="51" r="0.65" fill="#6B4436" opacity="0.65" />
        <circle cx="78" cy="53" r="0.65" fill="#6B4436" opacity="0.65" />
        <circle cx="106" cy="53" r="0.65" fill="#6B4436" opacity="0.65" />
        <circle cx="108" cy="51" r="0.65" fill="#6B4436" opacity="0.65" />
        <circle cx="111" cy="52" r="0.65" fill="#6B4436" opacity="0.65" />
        <circle cx="91" cy="53.5" r="0.65" fill="#6B4436" opacity="0.6" />
        <circle cx="93" cy="52.5" r="0.65" fill="#6B4436" opacity="0.6" />

        {/* Tiny Nose Dot */}
        <circle cx="92" cy="51" r="0.75" fill="#6B4436" opacity="0.75" />

        {/* Face Features: Eyebrows, Eyes, Mouth */}
        {renderEyebrows()}
        {renderEyes()}
        {renderMouth()}

        {/* Fluffy Side-Parted Storybook Bangs */}
        <path
          d="M69 34 C78 23 91 30 96 35 C101 28 110 26 115 34 C110 22 97 16 87 18 C78 19 72 26 69 34 Z"
          fill={hairDark}
        />
        <path d="M72 28 C80 22 90 28 94 32" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.5" />

        {/* Distinctive Silver Star Hair Clip (Matching Reference Image 2) */}
        <g id="StarHairClip" transform="translate(72, 22)">
          <path
            d="M 6 0 L 7.8 3.6 L 11.8 4.2 L 8.9 7 L 9.6 11 L 6 9.1 L 2.4 11 L 3.1 7 L 0.2 4.2 L 4.2 3.6 Z"
            fill="#FFFFFF"
            stroke="#D0D0D0"
            strokeWidth="1.2"
          />
          <circle cx="6" cy="5.5" r="1.2" fill="var(--color-ylang-ylang)" />
        </g>

        {/* Hand-drawn Cozy Traveler Outfit (Cozy Warm Cream & Cypress Vest) */}
        {/* Scarf Accent */}
        <path
          d="M74 63 C78 60 106 60 110 63 C113 68 107 75 92 75 C77 75 71 68 74 63 Z"
          fill="var(--color-chrysanthemum)"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {/* Scarf Tail */}
        <path
          d="M78 71 Q71 81 66 87 Q74 85 81 75 Z"
          fill="var(--color-chrysanthemum)"
          stroke={strokeColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Warm Storybook Blouse / Dress Base */}
        <path
          d="M72 73 C72 67 112 67 112 73 L116 95 C116 99 68 99 68 95 Z"
          fill="var(--color-vanilla-custard)"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Cypress Vest Accent */}
        <path d="M72 73 L83 73 L83 97 L69 95 Z" fill="var(--color-cypress)" opacity="0.9" />
        <path d="M112 73 L101 73 L101 97 L115 95 Z" fill="var(--color-cypress)" opacity="0.9" />
        {/* Buttons */}
        <circle cx="92" cy="79" r="1.5" fill="var(--color-wild-berry)" />
        <circle cx="92" cy="87" r="1.5" fill="var(--color-wild-berry)" />

        {/* Destination Outfit Accent (Paris Beret when outfit='paris') */}
        {outfit === 'paris' && (
          <g id="ParisBeretAccent">
            <path
              d="M74 24 C74 15 110 15 110 24 C114 26 70 26 74 24 Z"
              fill="var(--color-wild-berry)"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            <line x1="92" y1="15" x2="92" y2="10" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Traveler Satchel Crossbody Strap */}
        <line x1="76" y1="70" x2="106" y2="95" stroke={strokeColor} strokeWidth="1.8" strokeDasharray="3 2" />
        <rect x="102" y="90" width="10" height="8" rx="2" fill="var(--color-cypress)" stroke={strokeColor} strokeWidth="1.2" />

        {/* Seated Traveler Boots (Matching Reference Image 2 Dark Brown Boots resting on plane deck) */}
        <g id="TravelerBoots">
          {/* Left Boot */}
          <path
            d="M73 95 C73 92 85 92 85 95 L87 101 C87 104 71 104 71 101 Z"
            fill={hairDark}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          {/* Right Boot */}
          <path
            d="M99 95 C99 92 111 92 111 95 L113 101 C113 104 97 104 97 101 Z"
            fill={hairDark}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          {/* Cute Boot Top Trim */}
          <path d="M73 94 Q79 96 85 94" stroke="var(--color-vanilla-custard)" strokeWidth="1.2" fill="none" />
          <path d="M99 94 Q105 96 111 94" stroke="var(--color-vanilla-custard)" strokeWidth="1.2" fill="none" />
        </g>
      </g>

      {/* 
        ==================================================
        PART 2: MAGICAL PAPER AIRPLANE
        Hand-illustrated paper plane supporting Aan
        ==================================================
      */}
      <g id="PaperAirplane">
        {/* Main Wing Deck */}
        <polygon
          points="15,104 165,50 115,144 82,112"
          fill="var(--color-vanilla-custard)"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Wing Fold Shadow & Crease */}
        <polygon
          points="82,112 165,50 115,144"
          fill="var(--color-warm-sand)"
          opacity="0.95"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Underwing Accent Flap */}
        <polygon
          points="82,112 115,144 74,124"
          fill="var(--color-chrysanthemum)"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Vintage Travel Stamp Line Accent */}
        <line x1="42" y1="92" x2="138" y2="60" stroke="var(--color-bamboo)" strokeWidth="2.2" strokeDasharray="5 4" />
      </g>
    </svg>
  );
};

