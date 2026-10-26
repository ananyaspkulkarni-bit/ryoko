import React, { useState } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import {
  Button,
  IconButton,
  TextButton,
  Input,
  SearchInput,
  Card,
  PaperCard,
  SectionHeading,
  Badge,
  Tag,
  Divider,
  Tooltip,
  Modal,
  BottomSheet,
  SpeechBubble,
  DestinationLabel,
} from '../../components/ui';
import {
  Compass,
  Sparkles,
  MapPin,
  Heart,
  Share2,
  Bookmark,
  Calendar,
  Layers,
  Info,
} from 'lucide-react';

export const VisualPlayground: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('culture');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const colorSwatches = [
    { name: 'Warm Paper', hex: '#FFF4DB', token: 'var(--color-vanilla-custard)', role: 'Base Storybook Paper Surface' },
    { name: 'Jungle Green', hex: '#245C36', token: 'var(--color-cypress)', role: 'Primary Botanical Structure & Headings' },
    { name: 'Deep Ocean', hex: '#247BA0', token: 'var(--color-bright-marine)', role: 'Ocean Depth, Badges & Focus Accent' },
    { name: 'Sunshine Yellow', hex: '#FFD84D', token: 'var(--color-ylang-ylang)', role: 'Radiant Sunlit Accent & Energy' },
    { name: 'Warm Coral', hex: '#F07870', token: 'var(--color-chrysanthemum)', role: 'Aan Delight, Stamps & Interactive Tags' },
    { name: 'Sky Turquoise', hex: '#62D6C5', token: 'var(--color-aquamarine)', role: 'Atmospheric Breeze & Magical Sky' },
    { name: 'Deep Berry', hex: '#701C38', token: 'var(--color-wild-berry)', role: 'Deep Contrast Border & Tag Accent' },
    { name: 'Botanical Leaf', hex: '#8FA838', token: 'var(--color-bamboo)', role: 'Natural Botanical Foliage Accent' },
    { name: 'Deep Forest Shadow', hex: '#173C23', token: 'var(--color-deep-shadow-green)', role: 'Primary Editorial Headings' },
    { name: 'Warm Sand', hex: '#F6E5BF', token: 'var(--color-warm-sand)', role: 'Textured Elevation & Vintage Postcards' },
    { name: 'Princeton Orange', hex: '#FC8A2D', token: 'var(--color-princeton-orange)', role: 'Action Callout & Quick Pill' },
    { name: 'Vibrant Tomato', hex: '#D83B34', token: 'var(--color-tomato-jam)', role: 'Stamp Border Accent' },
  ];

  return (
    <MainLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
        {/* Museum Header */}
        <header style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-lg)' }}>
          <Badge variant="rosy" icon={<Sparkles size={14} />}>
            Phase 1 Visual Foundation
          </Badge>
          <h1
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: '2.5rem',
              color: 'var(--color-deep-forest)',
              margin: 'var(--space-xs) 0 4px 0',
            }}
          >
            Ryoko Design Museum & Visual Playground
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', margin: 0, maxWidth: '720px' }}>
            A cozy, tactile design system inspired by vintage travel journals, antique maps, and editorial travel guides.
          </p>
        </header>

        {/* Section 1: Color Palette */}
        <section>
          <SectionHeading
            title="1. Color System & Philosophy"
            subtitle="Warm Paper & Jungle Green anchor the travel journal; Deep Ocean & Sky Turquoise add atmosphere; Sunshine Yellow & Warm Coral bring playful delight."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-md)' }}>
            {colorSwatches.map((c) => (
              <Card key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    height: '60px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: c.token,
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--color-deep-forest)' }}>{c.name}</strong>
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {c.hex}
                  </span>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '2px' }}>{c.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Divider variant="ticket" />

        {/* Section 2: Typography Hierarchy */}
        <section>
          <SectionHeading
            title="2. Editorial Typography"
            subtitle="Playfair Display for editorial moments; Plus Jakarta Sans for interface controls."
          />
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>DISPLAY / DESTINATION SERIF</span>
              <h2 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '2.2rem', color: 'var(--color-deep-forest)', margin: 0 }}>
                Kyoto Temple Bamboo Groves
              </h2>
            </div>
            <Divider />
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>EDITORIAL SUBTITLE</span>
              <h3 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.4rem', color: 'var(--color-midnight-green)', fontStyle: 'italic', margin: 0 }}>
                “An unforgettable morning walk through morning mist and whispering bamboo stalks.”
              </h3>
            </div>
            <Divider />
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>INTERFACE BODY / SANS-SERIF</span>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Ryoko is an interactive travel companion powered by graph algorithms, trie autocomplete, and dijkstra shortest-path routing built from first principles.
              </p>
            </div>
          </Card>
        </section>

        <Divider variant="ticket" />

        {/* Section 3: Buttons & Controls */}
        <section>
          <SectionHeading
            title="3. Tactile Buttons & Controls"
            subtitle="Buttons feature spring-based hover and active physical feedback."
          />
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Button Variants</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <Button variant="primary" icon={<Compass size={18} />}>Explore Destination</Button>
                <Button variant="secondary" icon={<Bookmark size={18} />}>Saved Places</Button>
                <Button variant="accent" icon={<Sparkles size={18} />}>Ask Aan Companion</Button>
                <Button variant="ghost">Cancel</Button>
                <Button variant="primary" disabled>Disabled Action</Button>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>IconButton & TextButton</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <IconButton aria-label="Favorite destination" variant="secondary"><Heart size={18} /></IconButton>
                <IconButton aria-label="Share ticket" variant="primary"><Share2 size={18} /></IconButton>
                <IconButton aria-label="More info" variant="ghost"><Info size={18} /></IconButton>
                <TextButton icon={<Compass size={16} />}>Read Full Journal Entry</TextButton>
              </div>
            </div>
          </Card>
        </section>

        <Divider variant="ticket" />

        {/* Section 4: Inputs & Search */}
        <section>
          <SectionHeading
            title="4. Travel Inputs & Search"
            subtitle="Clean inputs with custom focus rings and clear buttons."
          />
          <Card style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
            <SearchInput
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Search Kyoto, sushi, or historical temples..."
            />
            <Input
              label="Traveler Journal Title"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="e.g. Summer Journey Across Kansai"
              helperText="Give your custom travel itinerary a memorable name."
            />
          </Card>
        </section>

        <Divider variant="ticket" />

        {/* Section 5: Cards & Paper Cards */}
        <section>
          <SectionHeading
            title="5. Cards & Postcards"
            subtitle="Tactile paper surfaces, postcard stamps, tape accents, and editorial blocks."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
            {/* Standard Card */}
            <Card variant="journal">
              <Badge variant="moss" icon={<Calendar size={12} />}>Day 2 Itinerary</Badge>
              <h3 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.3rem', margin: '8px 0', color: 'var(--color-deep-forest)' }}>
                Arashiyama Bamboo Grove Walk
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                Standard journal card with dashed vintage border and warm paper surface tone.
              </p>
            </Card>

            {/* Paper Postcard */}
            <PaperCard stampText="PASSPORT STAMP · KYOTO">
              <DestinationLabel name="KYOTO" subtitle="JAPAN · 35.0116° N" variant="ticket" />
              <h3 style={{ fontFamily: 'var(--font-family-serif)', fontSize: '1.4rem', margin: '14px 0 6px 0', color: 'var(--color-deep-brown)' }}>
                Fushimi Inari Vermilion Gates
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
                Vintage postcard card featuring subtle tape accent on top and decorative stamp in corner.
              </p>
            </PaperCard>
          </div>
        </section>

        <Divider variant="ticket" />

        {/* Section 6: Tags & Badges */}
        <section>
          <SectionHeading
            title="6. Tags & Status Stamps"
            subtitle="Category tags and travel passport badges."
          />
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Interactive Travel Tags
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['culture', 'food', 'temples', 'nature', 'urban-walks'].map((t) => (
                  <Tag
                    key={t}
                    label={t}
                    selected={selectedTag === t}
                    onClick={() => setSelectedTag(t)}
                  />
                ))}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Passport Status Badges
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <Badge variant="forest">Visited</Badge>
                <Badge variant="moss" icon={<Sparkles size={12} />}>Recommended by Aan</Badge>
                <Badge variant="rosy">Top Culinary Spot</Badge>
                <Badge variant="sky">Scenic Railway</Badge>
                <Badge variant="sand">Budget Friendly</Badge>
              </div>
            </div>
          </Card>
        </section>

        <Divider variant="ticket" />

        {/* Section 7: Aan Speech Bubble Foundation */}
        <section>
          <SectionHeading
            title="7. Aan Companion Speech Bubble"
            subtitle="Environmental speech bubble foundation designed to feel physically present in the journal world."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-lg)' }}>
            <SpeechBubble
              speakerLabel="Aan Companion"
              variant="journal"
              placement="bottom-left"
              message="“Welcome to Tokyo! Did you know Senso-ji temple was founded in 645 AD, making it Tokyo's oldest temple?”"
            />
            <SpeechBubble
              speakerLabel="Aan Hint"
              variant="announcement"
              placement="bottom-right"
              message="“Graph Dijkstra algorithm calculated the optimal bullet train route from Tokyo to Kyoto in 135 minutes!”"
            />
          </div>
        </section>

        <Divider variant="ticket" />

        {/* Section 8: Destination Labels */}
        <section>
          <SectionHeading
            title="8. Travel & Map Labels"
            subtitle="Inspired by old maps, travel tickets, and museum artifact plates."
          />
          <Card style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'center' }}>
            <DestinationLabel name="PARIS" subtitle="FRANCE" variant="postcard" />
            <DestinationLabel name="TOKYO" subtitle="35.6762° N · 139.6503° E" variant="ticket" />
            <DestinationLabel name="KYOTO" subtitle="ANCIENT CAPITAL" coordinates={{ lat: 35.0116, lng: 135.7681 }} variant="museum" />
          </Card>
        </section>

        <Divider variant="ticket" />

        {/* Section 9: Tooltips, Modal & BottomSheet Interactive Triggers */}
        <section>
          <SectionHeading
            title="9. Interactive Overlay Components"
            subtitle="Accessible Tooltips, Modal dialogs, and mobile BottomSheet drawers."
          />
          <Card style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'center' }}>
            <Tooltip content="Dijkstra shortest path algorithm weight: 135 mins">
              <Button variant="secondary" icon={<Layers size={18} />}>Hover for Algorithm Tooltip</Button>
            </Tooltip>

            <Button variant="primary" icon={<MapPin size={18} />} onClick={() => setIsModalOpen(true)}>
              Open Travel Journal Modal
            </Button>

            <Button variant="accent" icon={<Compass size={18} />} onClick={() => setIsBottomSheetOpen(true)}>
              Open Mobile BottomSheet
            </Button>
          </Card>
        </section>

        {/* Interactive Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Passport Entry Details"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <DestinationLabel name="KYOTO TEMPLE" subtitle="JAPAN" variant="postcard" />
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              This accessible modal trap features smooth spring entrance animation, backdrop blur, and full keyboard escape listener.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>Close</Button>
              <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>Confirm Entry</Button>
            </div>
          </div>
        </Modal>

        {/* Interactive BottomSheet */}
        <BottomSheet
          isOpen={isBottomSheetOpen}
          onClose={() => setIsBottomSheetOpen(false)}
          title="Travel Preferences Drawer"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              The BottomSheet provides a tactile slide-up drawer experience optimized for mobile screens.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Tag label="relaxed-pace" selected />
              <Tag label="budget-friendly" />
            </div>
            <Button variant="primary" onClick={() => setIsBottomSheetOpen(false)}>Apply Travel Preferences</Button>
          </div>
        </BottomSheet>
      </div>
    </MainLayout>
  );
};
