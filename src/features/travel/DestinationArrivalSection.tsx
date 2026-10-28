import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Stack } from '../../ds';
import { motion } from 'framer-motion';
import { PaperCard } from '../../components/ui/PaperCard';
import { Button } from '../../components/ui/Button';
import { AanSpeech } from '../aan/AanSpeech';
import { PaperPlane } from '../aan/PaperPlane';
import { DestinationHeroArtwork } from './DestinationHeroArtwork';
import { getDestinationData } from '../../data/destinations';
import { hybridPlanningService, PlanningSession } from '../../services/hybridPlanningService';
import { itineraryService } from '../../services/itineraryService';
import { itineraryPlanningEngine } from '../../services/itineraryPlanningEngine';
import { placesService } from '../../services/placesService';
import { flightService } from '../../services/flightService';
import { hotelService } from '../../services/hotelService';
import { weatherService } from '../../services/weatherService';
import { routesService } from '../../services/routesService';
import { formatINR, convertUsdToInr, convertInrToUsd } from '../../lib/currency';
import type { DetailedPlace } from '../../types/travel/places';
import type { FlightSearchResponse } from '../../types/travel/flights';
import type { HotelSearchResponse } from '../../types/travel/hotels';
import type {
  Destination,
  TravelStyle,
  GeneratedItineraryPlan,
  TripPreferences,
  PaceLevel,
  ComprehensiveItineraryPlan,
  FlightOption,
  HotelOption,
  WeatherResponse,
  RouteResponse,
} from '../../types';
import {
  Compass,
  Sparkles,
  MapPin,
  Coffee,
  Landmark,
  ArrowDown,
  Utensils,
  Home,
  Compass as NavigationIcon,
  SlidersHorizontal,
  Calendar,
  AlertTriangle,
  Plane,
  CloudSun,
  Clock,
  Info,
  RotateCw,
  CheckCircle2,
  Check,
  Trash2,
  Undo2,
} from 'lucide-react';


export interface DestinationArrivalSectionProps {
  destination?: Destination | null;
  onReturnToGlobe: () => void;
  travelPhase?: string;
}

export const DestinationArrivalSection: React.FC<DestinationArrivalSectionProps> = ({
  destination: inputDestination,
  onReturnToGlobe,
  travelPhase = 'arrived',
}) => {
  // SINGLE SOURCE OF TRUTH FOR DESTINATION
  const dest = getDestinationData(inputDestination);

  // TRIP PREFERENCES STATE FOR PLANNING ENGINE
  const [days, setDays] = useState<number>(1);
  const [travelers, setTravelers] = useState<number>(1);
  const [travelStyle, setTravelStyle] = useState<TravelStyle>('culture');
  const [pace, setPace] = useState<PaceLevel>('balanced');
  const [startDate, setStartDate] = useState<string>('2026-06-01');
  const [budgetInr, setBudgetInr] = useState<number>(25000);
  const budgetUsd = convertInrToUsd(budgetInr);

  // ACTIVE TRAVEL DOMAIN VIEW TAB
  const [activeTab, setActiveTab] = useState<'itinerary' | 'attractions' | 'flights' | 'hotels' | 'weather'>('itinerary');

  // TRAVEL SERVICE DATA STATE
  const [comprehensivePlan, setComprehensivePlan] = useState<ComprehensiveItineraryPlan | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedItineraryPlan | null>(null);
  const [places, setPlaces] = useState<DetailedPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState<boolean>(true);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [flights, setFlights] = useState<FlightOption[]>([]);
  const [originAirport, setOriginAirport] = useState<string>('JFK');
  const [flightsLoading, setFlightsLoading] = useState<boolean>(false);
  const [flightsError, setFlightsError] = useState<string | null>(null);
  const [flightResponse, setFlightResponse] = useState<FlightSearchResponse | null>(null);

  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState<boolean>(false);
  const [hotelsError, setHotelsError] = useState<string | null>(null);
  const [hotelResponse, setHotelResponse] = useState<HotelSearchResponse | null>(null);

  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherRefreshing, setWeatherRefreshing] = useState<boolean>(false);
  const [routesVerifying, setRoutesVerifying] = useState<boolean>(false);
  const [verifiedRoutesMap, setVerifiedRoutesMap] = useState<Record<string, RouteResponse>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [planError, setPlanError] = useState<string | null>(null);

  const [planningSession] = useState(() => new PlanningSession(hybridPlanningService));

  // ITINERARY HISTORY STACK (LIFO) FOR PLAN-LEVEL UNDO
  const [itineraryHistoryStack] = useState(() => new Stack<ComprehensiveItineraryPlan>());
  const [historySize, setHistorySize] = useState<number>(0);
  const currentPlanRef = useRef<ComprehensiveItineraryPlan | null>(null);
  const isRestoringPlanRef = useRef<boolean>(false);

  // ITINERARY INTERACTIVE STATE (COMPLETION & REMOVAL/RESTORE)
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());
  const [removedItemIds, setRemovedItemIds] = useState<Set<string>>(new Set());
  const [lastRemovedItem, setLastRemovedItem] = useState<{ id: string; title: string; dayNumber?: number } | null>(null);
  const [removedHistory, setRemovedHistory] = useState<Array<{ id: string; title: string; dayNumber?: number }>>([]);

  // Validate that an itinerary plan is non-empty and well-formed
  const isValidPlan = (
    plan: ComprehensiveItineraryPlan | null | undefined
  ): plan is ComprehensiveItineraryPlan => {
    if (!plan) return false;
    if (!plan.destinationId) return false;
    if (!Array.isArray(plan.comprehensiveDays) || plan.comprehensiveDays.length === 0) return false;
    const totalItems = plan.comprehensiveDays.reduce(
      (sum, d) => sum + (d.timelineItems?.length || 0),
      0
    );
    return totalItems > 0;
  };

  // Compare whether two plans are identical to avoid redundant history entries
  const arePlansEqual = (
    a: ComprehensiveItineraryPlan | null | undefined,
    b: ComprehensiveItineraryPlan | null | undefined
  ): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    if (
      a.destinationId !== b.destinationId ||
      a.totalDays !== b.totalDays ||
      a.pace !== b.pace ||
      a.travelStyle !== b.travelStyle ||
      a.totalEstimatedCost !== b.totalEstimatedCost ||
      a.isWeatherAdapted !== b.isWeatherAdapted ||
      a.isRoutesVerified !== b.isRoutesVerified
    ) {
      return false;
    }
    const itemsA = a.comprehensiveDays?.flatMap((d) => d.timelineItems.map((i) => i.id)) || [];
    const itemsB = b.comprehensiveDays?.flatMap((d) => d.timelineItems.map((i) => i.id)) || [];
    if (itemsA.length !== itemsB.length) return false;
    for (let i = 0; i < itemsA.length; i++) {
      if (itemsA[i] !== itemsB[i]) return false;
    }
    return true;
  };

  // Applies a new plan, pushing previous valid plan onto history stack (LIFO) if changed
  const applyPlan = useCallback(
    (nextPlan: ComprehensiveItineraryPlan, options?: { skipHistory?: boolean }) => {
      if (!isValidPlan(nextPlan)) {
        return;
      }

      const prevPlan = currentPlanRef.current;
      if (prevPlan && prevPlan.destinationId !== nextPlan.destinationId) {
        itineraryHistoryStack.clear();
        setHistorySize(0);
      } else if (!options?.skipHistory && isValidPlan(prevPlan) && !arePlansEqual(prevPlan, nextPlan)) {
        itineraryHistoryStack.push(prevPlan);
        setHistorySize(itineraryHistoryStack.size());
      }

      currentPlanRef.current = nextPlan;
      setComprehensivePlan(nextPlan);
      setGeneratedPlan(nextPlan);
      setPlanError(null);
    },
    [itineraryHistoryStack]
  );

  // Restores the most recent saved itinerary from the Stack (LIFO)
  const undoLastPlan = () => {
    if (itineraryHistoryStack.isEmpty()) {
      return;
    }
    const restoredPlan = itineraryHistoryStack.pop();
    setHistorySize(itineraryHistoryStack.size());
    if (!restoredPlan) {
      return;
    }

    const preferencesChanged =
      (restoredPlan.totalDays !== undefined && restoredPlan.totalDays !== days) ||
      (restoredPlan.pace !== undefined && restoredPlan.pace !== pace) ||
      (restoredPlan.travelStyle !== undefined && restoredPlan.travelStyle !== travelStyle);

    if (preferencesChanged) {
      isRestoringPlanRef.current = true;
      if (restoredPlan.totalDays !== undefined && restoredPlan.totalDays !== days) {
        setDays(restoredPlan.totalDays);
      }
      if (restoredPlan.pace !== undefined && restoredPlan.pace !== pace) {
        setPace(restoredPlan.pace);
      }
      if (restoredPlan.travelStyle !== undefined && restoredPlan.travelStyle !== travelStyle) {
        setTravelStyle(restoredPlan.travelStyle);
      }
    }

    currentPlanRef.current = restoredPlan;
    setComprehensivePlan(restoredPlan);
    setGeneratedPlan(restoredPlan);
    setPlanError(null);
    setRemovedItemIds(new Set());
    setCompletedItemIds(new Set());
    setLastRemovedItem(null);
    setRemovedHistory([]);
  };

  // Reset interactive overrides when destination changes
  const [prevDestId, setPrevDestId] = useState(dest.id);
  if (prevDestId !== dest.id) {
    setPrevDestId(dest.id);
    itineraryHistoryStack.clear();
    setHistorySize(0);
    setCompletedItemIds(new Set());
    setRemovedItemIds(new Set());
    setLastRemovedItem(null);
    setRemovedHistory([]);
  }

  const toggleItemCompleted = (itemId: string) => {
    setCompletedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const removeItem = (itemId: string, title: string, dayNumber?: number) => {
    setRemovedItemIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
    const entry = { id: itemId, title, dayNumber };
    setLastRemovedItem(entry);
    setRemovedHistory((prev) => [...prev, entry]);
  };

  const undoRemoveItem = (targetId?: string) => {
    setRemovedHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const idToRestore = targetId || prevHistory[prevHistory.length - 1].id;
      setRemovedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(idToRestore);
        return next;
      });
      const nextHistory = prevHistory.filter((item) => item.id !== idToRestore);
      setLastRemovedItem(nextHistory.length > 0 ? nextHistory[nextHistory.length - 1] : null);
      return nextHistory;
    });
  };

  const restoreAllItems = () => {
    setRemovedItemIds(new Set());
    setLastRemovedItem(null);
    setRemovedHistory([]);
  };

  const restoreDayItems = (dayItemIds: string[]) => {
    setRemovedItemIds((prev) => {
      const next = new Set(prev);
      for (const id of dayItemIds) {
        next.delete(id);
      }
      return next;
    });
    setRemovedHistory((prev) => prev.filter((item) => !dayItemIds.includes(item.id)));
    setLastRemovedItem((prev) => (prev && dayItemIds.includes(prev.id) ? null : prev));
  };

  const regenerateItinerary = () => {
    setRemovedItemIds(new Set());
    setCompletedItemIds(new Set());
    setLastRemovedItem(null);
    setRemovedHistory([]);
    try {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: dest.id,
        days,
        travelers,
        budget: budgetUsd,
        travelStyle,
        pace,
        startDate,
        interests: dest.tags || [],
        includeMeals: true,
        weatherForecast: weather?.forecast,
      });
      applyPlan(plan);
    } catch (err) {
      console.warn('Failed to regenerate itinerary:', err);
    }
  };

  // TRIGGER HYBRID & PLANNING ENGINE ON PREFERENCES / DESTINATION CHANGE
  useEffect(() => {
    if (isRestoringPlanRef.current) {
      isRestoringPlanRef.current = false;
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    const preferences: TripPreferences = {
      destinationId: dest.id,
      days,
      travelers,
      budget: budgetUsd,
      travelStyle,
      pace,
      startDate,
      interests: dest.tags || [],
    };

    // 1. Generate comprehensive planned itinerary with opening hours, meal breaks, and transit buffers
    try {
      const plan = itineraryPlanningEngine.planTrip({
        destinationId: dest.id,
        days,
        travelers,
        budget: budgetUsd,
        travelStyle,
        pace,
        startDate,
        interests: dest.tags || [],
        includeMeals: true,
      });

      if (!isCancelled) {
        applyPlan(plan);
      }
    } catch (err) {
      console.warn('ItineraryPlanningEngine fallback error:', err);
    }

    // 2. Query Hybrid Planning Session for AI / Deterministic coordination
    planningSession
      .requestPlan(preferences, (state) => {
        if (!isCancelled) {
          setIsLoading(state.isLoading);
          if (state.plan) {
            setGeneratedPlan(state.plan);
            setPlanError(null);
          }
          if (state.error) {
            setPlanError(state.error);
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error('Hybrid planning request error:', err);
          try {
            const fallback = itineraryService.generateItinerary(preferences);
            setGeneratedPlan(fallback);
            setPlanError(null);
          } catch {
            setPlanError(err instanceof Error ? err.message : 'Unable to generate itinerary.');
          }
          setIsLoading(false);
        }
      });

    // 3. Query Travel Data Service Layer for Attractions, Flights, Hotels, and Weather
    setPlacesLoading(true);
    setPlacesError(null);
    placesService
      .getPlaces(dest.id, { preferLive: true })
      .then((res) => {
        if (!isCancelled) {
          setPlaces(res);
          setPlacesLoading(false);
          setPlacesError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setPlaces(placesService.getPlacesSync(dest.id));
          setPlacesLoading(false);
          setPlacesError(err instanceof Error ? err.message : 'Unable to query live places');
        }
      });

    setFlightsLoading(true);
    setFlightsError(null);
    flightService
      .searchFlightsWithFallback(dest.name, {
        originAirport,
        departureDate: startDate,
        passengers: travelers,
        preferLive: true,
      })
      .then((res) => {
        if (!isCancelled) {
          setFlightResponse(res);
          setFlights(res.flights);
          setFlightsLoading(false);
          setFlightsError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setFlightsLoading(false);
          setFlightsError(err instanceof Error ? err.message : 'Unable to query flight schedules');
        }
      });

    setHotelsLoading(true);
    setHotelsError(null);
    hotelService
      .searchHotelsWithFallback(dest.id, {
        checkInDate: startDate,
        days,
        guests: travelers,
        preferLive: true,
      })
      .then((res) => {
        if (!isCancelled) {
          setHotelResponse(res);
          setHotels(res.hotels);
          setHotelsLoading(false);
          setHotelsError(null);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setHotelsLoading(false);
          setHotelsError(err instanceof Error ? err.message : 'Unable to query accommodations');
        }
      });

    weatherService
      .getWeather(
        {
          destinationId: dest.id,
          destinationName: dest.name,
          lat: dest.coordinates?.lat,
          lng: dest.coordinates?.lng,
          days,
        },
        { preferLive: true }
      )
      .then((wthr) => {
        if (!isCancelled) {
          setWeather(wthr);

          // When weather forecast arrives, dynamically generate weather-adapted plan
          if (wthr && wthr.forecast && wthr.forecast.length > 0) {
            try {
              const weatherPlan = itineraryPlanningEngine.planTrip({
                destinationId: dest.id,
                days,
                travelers,
                budget: budgetUsd,
                travelStyle,
                pace,
                startDate,
                interests: dest.tags || [],
                includeMeals: true,
                weatherForecast: wthr.forecast,
              });
              applyPlan(weatherPlan, { skipHistory: true });
            } catch (e) {
              console.warn('Weather re-planning exception:', e);
            }
          }
        }
      })
      .catch(() => null);

    return () => {
      isCancelled = true;
      planningSession.cancel();
    };
  }, [
    dest.id,
    dest.name,
    dest.tags,
    dest.coordinates?.lat,
    dest.coordinates?.lng,
    days,
    travelers,
    budgetUsd,
    travelStyle,
    pace,
    startDate,
    originAirport,
    planningSession,
    applyPlan,
  ]);

  const handleRefreshFlights = async (origin = originAirport) => {
    setFlightsLoading(true);
    setFlightsError(null);
    try {
      const res = await flightService.searchFlightsWithFallback(dest.name, {
        originAirport: origin,
        departureDate: startDate,
        passengers: travelers,
        preferLive: true,
      });
      setFlightResponse(res);
      setFlights(res.flights);
    } catch (err) {
      setFlightsError(err instanceof Error ? err.message : 'Failed to retrieve flights');
    } finally {
      setFlightsLoading(false);
    }
  };

  const handleRefreshHotels = async () => {
    setHotelsLoading(true);
    setHotelsError(null);
    try {
      const res = await hotelService.searchHotelsWithFallback(dest.id, {
        checkInDate: startDate,
        days,
        guests: travelers,
        preferLive: true,
      });
      setHotelResponse(res);
      setHotels(res.hotels);
    } catch (err) {
      setHotelsError(err instanceof Error ? err.message : 'Failed to retrieve accommodations');
    } finally {
      setHotelsLoading(false);
    }
  };


  const handleRefreshWeather = async () => {
    setWeatherRefreshing(true);
    try {
      const wthr = await weatherService.getWeather(
        {
          destinationId: dest.id,
          destinationName: dest.name,
          lat: dest.coordinates?.lat,
          lng: dest.coordinates?.lng,
          days,
        },
        { preferLive: true }
      );
      setWeather(wthr);
      if (wthr && wthr.forecast && wthr.forecast.length > 0) {
        const weatherPlan = itineraryPlanningEngine.planTrip({
          destinationId: dest.id,
          days,
          travelers,
          budget: budgetUsd,
          travelStyle,
          pace,
          startDate,
          interests: dest.tags || [],
          includeMeals: true,
          weatherForecast: wthr.forecast,
        });
        applyPlan(weatherPlan);
      }
    } catch (err) {
      console.warn('Weather refresh failed:', err);
    } finally {
      setWeatherRefreshing(false);
    }
  };

  const handleVerifyRoutes = async () => {
    if (!comprehensivePlan || routesVerifying) return;
    setRoutesVerifying(true);
    try {
      const updatedRoutesMap: Record<string, RouteResponse> = { ...verifiedRoutesMap };
      const legPromises: Promise<void>[] = [];

      for (const day of comprehensivePlan.comprehensiveDays) {
        const activities = day.timelineItems.filter(
          (item) => item.itemType === 'activity' && item.coordinates
        );
        for (let i = 1; i < activities.length; i++) {
          const prev = activities[i - 1];
          const curr = activities[i];
          if (prev.coordinates && curr.coordinates) {
            const key1 = `${prev.activity?.id || prev.id}->${curr.activity?.id || curr.id}`;
            const key2 = `${prev.coordinates.lat.toFixed(4)},${prev.coordinates.lng.toFixed(4)}->${curr.coordinates.lat.toFixed(4)},${curr.coordinates.lng.toFixed(4)}`;

            const p = routesService
              .calculateRoute(
                {
                  origin: prev.coordinates,
                  destination: curr.coordinates,
                  originName: prev.title,
                  destinationName: curr.title,
                },
                { preferLive: true }
              )
              .then((routeRes) => {
                updatedRoutesMap[key1] = routeRes;
                updatedRoutesMap[key2] = routeRes;
              })
              .catch((err) => {
                console.warn('Leg route calculation warning:', err);
              });
            legPromises.push(p);
          }
        }
      }

      await Promise.all(legPromises);
      setVerifiedRoutesMap(updatedRoutesMap);

      if (Object.keys(updatedRoutesMap).length > 0) {
        const updatedPlan = itineraryPlanningEngine.planTrip({
          destinationId: dest.id,
          days,
          travelers,
          budget: budgetUsd,
          travelStyle,
          pace,
          startDate,
          interests: dest.tags || [],
          includeMeals: true,
          weatherForecast: weather?.forecast,
          verifiedRoutes: updatedRoutesMap,
        });
        applyPlan(updatedPlan);
      }
    } catch (err) {
      console.warn('Failed to verify live routes:', err);
    } finally {
      setRoutesVerifying(false);
    }
  };

  const [activeCategory, setActiveCategory] = useState<
    'transport' | 'food' | 'stay' | 'mustVisit' | 'mustTry' | 'mustDo'
  >('food');

  const categoryLabels = [
    { id: 'transport', name: 'Transport', icon: NavigationIcon },
    { id: 'food', name: 'Food & Dining', icon: Coffee },
    { id: 'stay', name: 'Where to Stay', icon: Home },
    { id: 'mustVisit', name: 'Must Visit', icon: Landmark },
    { id: 'mustTry', name: 'Must Try', icon: Utensils },
    { id: 'mustDo', name: 'Must Do', icon: Sparkles },
  ] as const;

  const activeCategoryItems = dest.categories?.[activeCategory] || [
    `Curated local ${activeCategory} highlights in ${dest.name}`,
    `Authentic experience in ${dest.country}`,
    `Aan's recommended spots across ${dest.name}`,
  ];

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
      {/* 
        ==================================================
        FULL-SCREEN DYNAMIC DESTINATION HERO ARRIVAL SCENE (100vh)
        ==================================================
      */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-2xl) var(--space-xl)',
          backgroundColor: 'var(--color-cream)',
          backgroundImage: 'radial-gradient(var(--color-warm-sand) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Top Return to Globe Navigation */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 50,
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            icon={<Compass size={16} style={{ color: 'var(--color-cypress)' }} />}
            onClick={onReturnToGlobe}
            style={{
              boxShadow: 'var(--shadow-sm)',
              backgroundColor: 'var(--bg-surface-elevated)',
            }}
          >
            ← Globe
          </Button>
        </div>

        {/* Header Label: CITY / Country */}
        <div style={{ textAlign: 'center', zIndex: 10, marginTop: 'var(--space-md)' }}>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.22em',
              color: 'var(--color-blush-rose)',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            <MapPin size={14} /> {dest.country.toUpperCase()} · {dest.coordinates.lat.toFixed(4)}° N,{' '}
            {dest.coordinates.lng.toFixed(4)}° E
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: 'clamp(3.5rem, 8vw, 6rem)',
              letterSpacing: '0.1em',
              color: 'var(--text-heading)',
              margin: 0,
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {dest.name}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-family-sans)',
              fontSize: '1.2rem',
              fontStyle: 'italic',
              color: 'var(--text-muted)',
              marginTop: '4px',
              margin: 0,
            }}
          >
            {dest.subtitle || dest.description}
          </p>
        </div>

        {/* Dynamic Destination Visual Artwork */}
        <DestinationHeroArtwork type={dest.landmarkSvgType || 'generic'} cityName={dest.name} />

        {/* Sparkle Separator & Aan Companion Speech Greeting */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', zIndex: 10 }}>
          <div style={{ color: 'var(--color-chrysanthemum)', fontSize: '1.4rem' }}>✦</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <PaperPlane motionState="LANDED" />
            <AanSpeech
              travelPhase={travelPhase as any}
              destinationName={dest.name}
              arrivalMessage={dest.arrivalMessage}
              weatherCondition={weather?.current.conditionLabel}
              temperatureC={weather?.current.temperatureC}
              isWeatherAdapted={comprehensivePlan?.isWeatherAdapted}
            />
          </div>
        </div>

        {/* Scroll Down Prompt */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginTop: 'var(--space-md)',
          }}
        >
          <span>Scroll down for today's curated {dest.name} itinerary & travel services</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ArrowDown size={18} style={{ color: 'var(--color-princeton-orange)' }} />
          </motion.div>
        </div>
      </motion.div>

      {/* 
        ==================================================
        CONTINUOUS VERTICAL SCROLL SECTION (PLANNER & SERVICES)
        ==================================================
      */}
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto',
          padding: 'var(--space-2xl) var(--space-xl)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2xl)',
        }}
      >
        {/* Continuation Title Banner */}
        <div
          style={{
            textAlign: 'center',
            borderBottom: '2px dashed var(--border-strong)',
            paddingBottom: 'var(--space-lg)',
          }}
        >
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'var(--color-blush-rose)',
              textTransform: 'uppercase',
            }}
          >
            {dest.name.toUpperCase()} · {dest.country.toUpperCase()}
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-family-serif)',
              fontSize: '2.5rem',
              color: 'var(--text-heading)',
              margin: '8px 0 4px 0',
            }}
          >
            "I've planned your trip to {dest.name}."
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Aan's planning engine configured for {days} {days === 1 ? 'day' : 'days'} & {travelers}{' '}
            {travelers === 1 ? 'traveller' : 'travellers'} with {pace} pace in {dest.name}.
          </p>
        </div>

        {/* 
          ==================================================
          TRIP PREFERENCES CONTROLS DOCK
          ==================================================
        */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '2px solid var(--color-cypress)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            boxShadow: 'var(--shadow-postcard)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: 'var(--font-family-serif)',
                  margin: 0,
                  fontSize: '1.35rem',
                  color: 'var(--text-heading)',
                }}
              >
                Personalise Trip Preferences
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Adjust dates, pace, duration, travellers & style to re-generate Aan's custom itinerary.
              </p>
            </div>

            {isLoading ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--color-princeton-orange)',
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  style={{ display: 'flex' }}
                >
                  <Compass size={16} />
                </motion.div>
                Planning Itinerary...
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--color-cypress)',
                }}
              >
                <SlidersHorizontal size={16} /> Planning Engine Active
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '14px',
            }}
          >
            {/* Duration Buttons */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Duration
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family-sans)',
                      backgroundColor: days === d ? 'var(--color-cypress)' : 'var(--color-vanilla-custard)',
                      color: days === d ? '#FFFFFF' : 'var(--text-primary)',
                      border:
                        days === d
                          ? '1px solid var(--color-cypress)'
                          : '1px solid var(--color-chrysanthemum)',
                    }}
                  >
                    {d} {d === 1 ? 'Day' : 'Days'}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Pace Buttons */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Pace
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['relaxed', 'balanced', 'fast-paced'] as PaceLevel[]).map((p) => {
                  const label = p === 'relaxed' ? 'Relaxed' : p === 'balanced' ? 'Balanced' : 'Fast';
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPace(p)}
                      style={{
                        flex: 1,
                        padding: '7px 8px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-family-sans)',
                        backgroundColor: pace === p ? 'var(--color-cypress)' : 'var(--color-vanilla-custard)',
                        color: pace === p ? '#FFFFFF' : 'var(--text-primary)',
                        border:
                          pace === p
                            ? '1px solid var(--color-cypress)'
                            : '1px solid var(--color-chrysanthemum)',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trip Start Date */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-family-sans)',
                  backgroundColor: 'var(--color-vanilla-custard)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--color-chrysanthemum)',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Travellers Buttons */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Travellers
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 4].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTravelers(t)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family-sans)',
                      backgroundColor: travelers === t ? 'var(--color-cypress)' : 'var(--color-vanilla-custard)',
                      color: travelers === t ? '#FFFFFF' : 'var(--text-primary)',
                      border:
                        travelers === t
                          ? '1px solid var(--color-cypress)'
                          : '1px solid var(--color-chrysanthemum)',
                    }}
                  >
                    {t} {t === 1 ? 'Person' : 'People'}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Style Selector */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Travel Style
              </label>
              <select
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value as TravelStyle)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-family-sans)',
                  backgroundColor: 'var(--color-vanilla-custard)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--color-chrysanthemum)',
                  cursor: 'pointer',
                }}
              >
                <option value="culture">Culture & History</option>
                <option value="foodie">Foodie & Local Flavors</option>
                <option value="relaxed">Relaxed & Stroll</option>
                <option value="adventure">Adventure & Nature</option>
                <option value="photography">Photography & Views</option>
                <option value="budget">Budget Friendly</option>
              </select>
            </div>

            {/* Budget Range */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                }}
              >
                Trip Budget ({formatINR(budgetInr)})
              </label>
              <input
                type="range"
                min="5000"
                max="100000"
                step="2500"
                value={budgetInr}
                onChange={(e) => setBudgetInr(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-cypress)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* 
          ==================================================
          TRAVEL SERVICES & ITINERARY TABS BAR
          ==================================================
        */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '6px',
            backgroundColor: 'var(--color-vanilla-custard)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('itinerary')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              backgroundColor: activeTab === 'itinerary' ? 'var(--color-cypress)' : 'transparent',
              color: activeTab === 'itinerary' ? '#FFFFFF' : 'var(--text-primary)',
              border: 'none',
              boxShadow: activeTab === 'itinerary' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            <Calendar size={15} /> Itinerary Plan
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attractions')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              backgroundColor: activeTab === 'attractions' ? 'var(--color-cypress)' : 'transparent',
              color: activeTab === 'attractions' ? '#FFFFFF' : 'var(--text-primary)',
              border: 'none',
              boxShadow: activeTab === 'attractions' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            <Landmark size={15} /> Attractions ({places.length}){places.some((p) => p.provenance === 'verified_provider') ? ' · Live' : ''}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('flights')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              backgroundColor: activeTab === 'flights' ? 'var(--color-cypress)' : 'transparent',
              color: activeTab === 'flights' ? '#FFFFFF' : 'var(--text-primary)',
              border: 'none',
              boxShadow: activeTab === 'flights' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            <Plane size={15} /> Flights ({flights.length}){flightResponse?.liveFareVerified && !flightResponse?.isMock ? ' · Live' : ''}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hotels')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              backgroundColor: activeTab === 'hotels' ? 'var(--color-cypress)' : 'transparent',
              color: activeTab === 'hotels' ? '#FFFFFF' : 'var(--text-primary)',
              border: 'none',
              boxShadow: activeTab === 'hotels' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            <Home size={15} /> Stays ({hotels.length}){hotelResponse?.liveAvailabilityVerified && !hotelResponse?.isMock ? ' · Live' : ''}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weather')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              backgroundColor: activeTab === 'weather' ? 'var(--color-cypress)' : 'transparent',
              color: activeTab === 'weather' ? '#FFFFFF' : 'var(--text-primary)',
              border: 'none',
              boxShadow: activeTab === 'weather' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            <CloudSun size={15} /> Weather ({weather?.current.temperatureC ?? 22}°C{weather && (!weather.isMock || weather.liveForecastVerified) ? ' · Live' : ''})
          </button>

        </div>

        {/* 
          ==================================================
          TAB 1: ITINERARY VIEW (ENRICHED WITH ENGINE FEATURES)
          ==================================================
        */}
        {activeTab === 'itinerary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
            {/* Error State Banner */}
            {planError && (
              <div
                style={{
                  backgroundColor: 'rgba(240, 120, 112, 0.18)',
                  border: '1px solid var(--color-blush-rose)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-wild-berry)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={20} style={{ color: 'var(--color-blush-rose)', flexShrink: 0 }} />
                <div>
                  <strong>Planning Engine Notice:</strong> {planError}
                </div>
              </div>
            )}

            {/* Budget Warning Banner if Exceeded */}
            {generatedPlan && !generatedPlan.isWithinBudget && (
              <div
                style={{
                  backgroundColor: 'rgba(240, 120, 112, 0.18)',
                  border: '1px solid var(--color-blush-rose)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-wild-berry)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={20} style={{ color: 'var(--color-blush-rose)', flexShrink: 0 }} />
                <div>{generatedPlan.warnings[0]}</div>
              </div>
            )}

            {/* Insufficient / Unverified Data Notice Banner */}
            {generatedPlan && generatedPlan.hasVerifiedActivities === false && (
              <PaperCard stampText="UNVERIFIED DESTINATION">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-blush-rose)' }}>
                    <AlertTriangle size={18} />
                    <h4
                      style={{
                        fontFamily: 'var(--font-family-serif)',
                        margin: 0,
                        fontSize: '1.15rem',
                        color: 'var(--text-heading)',
                      }}
                    >
                      No Verified Activities Yet
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    Ryoko could not retrieve verified local recommendations or attractions for{' '}
                    <strong>{dest.name}</strong> right now. Rather than presenting generic placeholder
                    activities or guessed admission prices, Ryoko leaves this schedule open until verified partner
                    data is available.
                  </p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    ✨ <em>Try exploring one of our verified curated destinations:</em>{' '}
                    <strong>Paris, Cairo, Tokyo, Mumbai, or Rome</strong>.
                  </div>
                </div>
              </PaperCard>
            )}

            {/* Pacing & Buffer Summary Banner */}
            {comprehensivePlan && (
              <div
                style={{
                  backgroundColor: 'var(--color-vanilla-custard)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={15} style={{ color: 'var(--color-cypress)', flexShrink: 0 }} />
                  <span>
                    <strong>Pacing & Routing:</strong> {comprehensivePlan.travelBuffersSummary}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: comprehensivePlan.isRoutesVerified
                        ? 'rgba(42, 157, 143, 0.2)'
                        : 'rgba(231, 111, 81, 0.15)',
                      color: comprehensivePlan.isRoutesVerified
                        ? 'var(--color-cypress)'
                        : 'var(--color-wild-berry)',
                      border: '1px solid currentColor',
                    }}
                  >
                    {comprehensivePlan.isRoutesVerified ? 'Live Routes Verified' : 'Geodesic Buffer (Simulated)'}
                  </span>
                  <button
                    type="button"
                    onClick={handleVerifyRoutes}
                    disabled={routesVerifying}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--color-vanilla-custard)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <RotateCw size={12} className={routesVerifying ? 'animate-spin' : ''} />
                    {routesVerifying ? 'Verifying...' : 'Verify Live Routes'}
                  </button>
                </div>
              </div>
            )}

            {/* Weather-Aware Adaptation Banner */}
            {comprehensivePlan && (
              <div
                style={{
                  backgroundColor: comprehensivePlan.isWeatherAdapted
                    ? 'rgba(42, 157, 143, 0.12)'
                    : 'var(--color-vanilla-custard)',
                  border: comprehensivePlan.isWeatherAdapted
                    ? '1px solid var(--color-cypress)'
                    : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <CloudSun
                    size={16}
                    style={{
                      color: comprehensivePlan.isWeatherAdapted ? 'var(--color-cypress)' : 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  />
                  <span>
                    <strong>Weather Engine:</strong>{' '}
                    {comprehensivePlan.isWeatherAdapted
                      ? comprehensivePlan.weatherSummary
                      : 'Weather adaptation unavailable: forecast data offline.'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {weather && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: !weather.isMock
                          ? 'rgba(42, 157, 143, 0.2)'
                          : 'rgba(231, 111, 81, 0.15)',
                        color: !weather.isMock ? 'var(--color-cypress)' : 'var(--color-wild-berry)',
                        border: '1px solid currentColor',
                      }}
                    >
                      {!weather.isMock ? 'Live OpenWeather' : 'Simulated Climatology'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleRefreshWeather}
                    disabled={weatherRefreshing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--color-vanilla-custard)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <RotateCw size={12} className={weatherRefreshing ? 'animate-spin' : ''} />
                    {weatherRefreshing ? 'Refreshing...' : 'Adapt Itinerary'}
                  </button>
                </div>
              </div>
            )}

            {/* Uncurated Destination Notice */}
            {comprehensivePlan && !comprehensivePlan.hasVerifiedActivities && (
              <div
                style={{
                  backgroundColor: 'rgba(231, 111, 81, 0.1)',
                  border: '1px solid var(--color-princeton-orange)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <Info size={20} style={{ color: 'var(--color-princeton-orange)', flexShrink: 0 }} />
                <div>
                  <strong>Notice:</strong> Verified local activity data is currently unrecorded for {dest.name}.
                  Ryoko never generates synthetic activities or fabricated ticket prices. Explore our curated
                  destinations (Paris, Tokyo, Cairo, Mumbai, Rome, Bangkok) for authentic recommendations.
                </div>
              </div>
            )}

            {/* Day-by-Day Cards & Interactive Itinerary Controls */}
            {comprehensivePlan && (() => {
              const allActiveItems = comprehensivePlan.comprehensiveDays.flatMap((day) =>
                day.timelineItems.filter((item) => !removedItemIds.has(item.id))
              );
              const totalTripCostUsd = allActiveItems.reduce(
                (sum, item) => sum + (typeof item.costForGroup === 'number' ? item.costForGroup : 0),
                0
              );
              const totalCompletedCount = allActiveItems.filter((item) => completedItemIds.has(item.id)).length;
              const completionPercent = allActiveItems.length > 0
                ? Math.round((totalCompletedCount / allActiveItems.length) * 100)
                : 0;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
                  {/* Top Live Itinerary Summary Bar */}
                  <div
                    style={{
                      backgroundColor: 'var(--color-vanilla-custard)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px 18px',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      {/* Left: Stops & Completion Progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Compass size={18} style={{ color: 'var(--color-cypress)' }} />
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                            Live Itinerary Summary
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: 'var(--color-cypress)',
                            backgroundColor: 'rgba(36, 92, 54, 0.08)',
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid rgba(36, 92, 54, 0.2)',
                          }}
                        >
                          {allActiveItems.length} {allActiveItems.length === 1 ? 'stop' : 'stops'}
                          {totalCompletedCount > 0 ? ` · ${totalCompletedCount} done (${completionPercent}%)` : ''}
                        </span>
                        {removedItemIds.size > 0 && (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'var(--color-wild-berry)',
                              backgroundColor: 'rgba(231, 111, 81, 0.1)',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {removedItemIds.size} removed
                          </span>
                        )}
                      </div>

                      {/* Right: Cost & Quick Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Synchronized Total Cost ({travelers} {travelers === 1 ? 'traveller' : 'travellers'})
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'flex-end' }}>
                            <span style={{ color: 'var(--color-cypress)', fontSize: '1.15rem', fontWeight: 800 }}>
                              {formatINR(convertUsdToInr(totalTripCostUsd))}
                            </span>
                            {travelers > 1 && totalTripCostUsd > 0 && (
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                ({formatINR(convertUsdToInr(totalTripCostUsd / travelers))}/person)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stack LIFO Undo Button: Restores previous valid generated plan */}
                        <button
                          type="button"
                          id="undo-last-plan-btn-top"
                          onClick={undoLastPlan}
                          disabled={historySize === 0}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: historySize > 0 ? 'var(--color-cypress)' : 'rgba(0, 0, 0, 0.04)',
                            color: historySize > 0 ? '#FFFFFF' : 'var(--text-muted)',
                            border: historySize > 0 ? '1px solid var(--color-cypress)' : '1px solid var(--border-color)',
                            cursor: historySize > 0 ? 'pointer' : 'not-allowed',
                            boxShadow: historySize > 0 ? 'var(--shadow-sm)' : 'none',
                            opacity: historySize > 0 ? 1 : 0.6,
                            transition: 'all 150ms ease',
                          }}
                          title={
                            historySize > 0
                              ? `Restore previous itinerary plan (${historySize} in stack)`
                              : 'No previous plan in history to restore'
                          }
                        >
                          <Undo2 size={13} />
                          Undo Last Plan{historySize > 0 ? ` (${historySize})` : ''}
                        </button>

                        {removedItemIds.size > 0 && (
                          <button
                            type="button"
                            onClick={restoreAllItems}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 12px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--color-cypress)',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: 'var(--shadow-sm)',
                            }}
                            title="Restore all removed activities"
                          >
                            <Undo2 size={13} />
                            Restore All ({removedItemIds.size})
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {allActiveItems.length > 0 && (
                      <div
                        style={{
                          width: '100%',
                          height: '5px',
                          backgroundColor: 'rgba(0, 0, 0, 0.07)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${completionPercent}%`,
                            height: '100%',
                            backgroundColor: 'var(--color-cypress)',
                            transition: 'width 250ms ease-in-out',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Undo Notification Banner */}
                  {lastRemovedItem && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        backgroundColor: 'var(--color-vanilla-custard)',
                        border: '1px solid var(--color-cypress)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        fontSize: '0.85rem',
                        boxShadow: 'var(--shadow-sm)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                        <Info size={16} style={{ color: 'var(--color-cypress)', flexShrink: 0 }} />
                        <span>
                          Removed <strong>"{lastRemovedItem.title}"</strong>
                          {lastRemovedItem.dayNumber ? ` from Day ${lastRemovedItem.dayNumber}` : ''}.
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => undoRemoveItem(lastRemovedItem.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            backgroundColor: 'var(--color-cypress)',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Undo2 size={13} />
                          Undo
                        </button>
                        {removedHistory.length > 1 && (
                          <button
                            type="button"
                            onClick={restoreAllItems}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '0.78rem',
                              color: 'var(--color-cypress)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            Restore All ({removedItemIds.size})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setLastRemovedItem(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Empty State when all activities across all days are removed */}
                  {allActiveItems.length === 0 ? (
                    <PaperCard stampText="ITINERARY CLEARED">
                      <div style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-md)' }}>
                        <Calendar size={44} style={{ color: 'var(--color-bamboo)', margin: '0 auto 14px auto' }} />
                        <h4
                          style={{
                            fontFamily: 'var(--font-family-serif)',
                            margin: '0 0 8px 0',
                            fontSize: '1.35rem',
                            color: 'var(--text-heading)',
                          }}
                        >
                          All Activities Removed
                        </h4>
                        <p
                          style={{
                            margin: '0 0 20px 0',
                            fontSize: '0.9rem',
                            color: 'var(--text-muted)',
                            maxWidth: '480px',
                            marginInline: 'auto',
                            lineHeight: 1.6,
                          }}
                        >
                          You have removed all activities from your {dest.name} schedule. You can restore your removed activities or regenerate a fresh itinerary tailored to your preferences.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={restoreAllItems}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '9px 20px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--color-cypress)',
                              color: '#FFFFFF',
                              border: 'none',
                              cursor: 'pointer',
                              boxShadow: 'var(--shadow-sm)',
                            }}
                          >
                            <Undo2 size={15} />
                            Restore All Activities ({removedItemIds.size})
                          </button>
                          <button
                            type="button"
                            id="undo-last-plan-btn-empty"
                            onClick={undoLastPlan}
                            disabled={historySize === 0}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '9px 20px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              backgroundColor: historySize > 0 ? 'var(--color-cypress)' : 'rgba(0, 0, 0, 0.05)',
                              color: historySize > 0 ? '#FFFFFF' : 'var(--text-muted)',
                              border: historySize > 0 ? 'none' : '1px solid var(--border-color)',
                              cursor: historySize > 0 ? 'pointer' : 'not-allowed',
                              boxShadow: historySize > 0 ? 'var(--shadow-sm)' : 'none',
                              opacity: historySize > 0 ? 1 : 0.6,
                            }}
                            title={
                              historySize > 0
                                ? `Restore previous itinerary plan (${historySize} in stack)`
                                : 'No previous plan in history to restore'
                            }
                          >
                            <Undo2 size={15} />
                            Undo Last Plan{historySize > 0 ? ` (${historySize})` : ''}
                          </button>
                          <button
                            type="button"
                            onClick={regenerateItinerary}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '9px 20px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--color-vanilla-custard)',
                              color: 'var(--color-cypress)',
                              border: '1px solid var(--color-cypress)',
                              cursor: 'pointer',
                              boxShadow: 'var(--shadow-sm)',
                            }}
                          >
                            <RotateCw size={15} />
                            Regenerate Itinerary
                          </button>
                        </div>
                      </div>
                    </PaperCard>
                  ) : (
                    comprehensivePlan.comprehensiveDays.map((dayPlan) => {
                      const activeTimelineItems = dayPlan.timelineItems.filter(
                        (item) => !removedItemIds.has(item.id)
                      );
                      const dayCostUsd = activeTimelineItems.reduce(
                        (sum, item) => sum + (typeof item.costForGroup === 'number' ? item.costForGroup : 0),
                        0
                      );
                      const dayCompletedCount = activeTimelineItems.filter((item) =>
                        completedItemIds.has(item.id)
                      ).length;

                      return (
                        <div
                          key={dayPlan.dayNumber}
                          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
                        >
                          {/* Day Header */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              borderBottom: '2px solid var(--color-bamboo)',
                              paddingBottom: '8px',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Calendar size={18} style={{ color: 'var(--color-cypress)' }} />
                              <div>
                                <h3
                                  style={{
                                    fontFamily: 'var(--font-family-serif)',
                                    margin: 0,
                                    fontSize: '1.35rem',
                                    color: 'var(--text-heading)',
                                  }}
                                >
                                  {dayPlan.title}
                                </h3>
                                {dayPlan.weatherAdaptationNote && (
                                  <div
                                    style={{
                                      fontSize: '0.74rem',
                                      color: 'var(--color-cypress)',
                                      backgroundColor: 'rgba(42, 157, 143, 0.1)',
                                      border: '1px solid rgba(42, 157, 143, 0.25)',
                                      padding: '2px 8px',
                                      borderRadius: 'var(--radius-sm)',
                                      marginTop: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                    }}
                                  >
                                    <CloudSun size={13} />
                                    <span>{dayPlan.weatherAdaptationNote}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  color: 'var(--color-cypress)',
                                  backgroundColor: 'rgba(36, 92, 54, 0.08)',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontWeight: 700,
                                }}
                              >
                                {activeTimelineItems.length} {activeTimelineItems.length === 1 ? 'stop' : 'stops'}
                                {dayCompletedCount > 0 ? ` · ${dayCompletedCount} done` : ''}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.82rem',
                                  color: 'var(--text-muted)',
                                  fontWeight: 700,
                                }}
                              >
                                Est. Cost: {formatINR(convertUsdToInr(dayCostUsd))}
                                {travelers > 1 && dayCostUsd > 0
                                  ? ` total (${formatINR(convertUsdToInr(dayCostUsd / travelers))}/person)`
                                  : ` for ${travelers} traveller${travelers === 1 ? '' : 's'}`}
                              </span>
                            </div>
                          </div>

                          {/* Day empty state if all items of this day are removed */}
                          {activeTimelineItems.length === 0 ? (
                            <div
                              style={{
                                backgroundColor: 'var(--color-vanilla-custard)',
                                border: '1px dashed var(--border-color)',
                                borderRadius: 'var(--radius-md)',
                                padding: '16px',
                                textAlign: 'center',
                                fontSize: '0.85rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span>All activities removed for Day {dayPlan.dayNumber}.</span>
                              <button
                                type="button"
                                onClick={() => restoreDayItems(dayPlan.timelineItems.map((i) => i.id))}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: 'none',
                                  border: '1px solid var(--color-cypress)',
                                  borderRadius: 'var(--radius-sm)',
                                  padding: '3px 10px',
                                  color: 'var(--color-cypress)',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                }}
                              >
                                <Undo2 size={13} />
                                Restore Day {dayPlan.dayNumber} activities
                              </button>
                            </div>
                          ) : (
                            /* Timeline Items (Activities & Reasonable Meal Breaks) */
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                gap: 'var(--space-lg)',
                              }}
                            >
                              {activeTimelineItems.map((item) => {
                                const isMeal = item.itemType === 'meal';
                                const isCompleted = completedItemIds.has(item.id);
                                const IconComp = isMeal
                                  ? Utensils
                                  : item.category === 'food'
                                  ? Coffee
                                  : item.category === 'landmark'
                                  ? Landmark
                                  : item.category === 'nature'
                                  ? Sparkles
                                  : Compass;

                                const stampLabel = isCompleted
                                  ? '✓ COMPLETED'
                                  : isMeal
                                  ? 'DINING BREAK'
                                  : `${item.startTime} - ${item.endTime}`;

                                return (
                                  <PaperCard
                                    key={item.id}
                                    stampText={stampLabel}
                                    style={
                                      isCompleted
                                        ? {
                                            border: '2px solid var(--color-cypress)',
                                            backgroundColor: 'rgba(36, 92, 54, 0.06)',
                                          }
                                        : undefined
                                    }
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                      <IconComp
                                        size={20}
                                        style={{
                                          color: isMeal ? 'var(--color-princeton-orange)' : 'var(--color-cypress)',
                                        }}
                                      />
                                      <h4
                                        style={{
                                          fontFamily: 'var(--font-family-serif)',
                                          margin: 0,
                                          fontSize: '1.15rem',
                                          color: isCompleted ? 'var(--color-cypress)' : 'var(--text-heading)',
                                          textDecoration: isCompleted ? 'line-through' : 'none',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                        }}
                                      >
                                        {isCompleted && <CheckCircle2 size={16} style={{ color: 'var(--color-cypress)', flexShrink: 0 }} />}
                                        {item.title}
                                      </h4>
                                    </div>

                                    {/* Location details */}
                                    <div
                                      style={{
                                        fontSize: '0.74rem',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        marginBottom: '6px',
                                      }}
                                    >
                                      <MapPin size={12} style={{ color: 'var(--color-cypress)', flexShrink: 0 }} />
                                      <span>
                                        {dest.name}
                                        {item.coordinates ? ` · ${item.coordinates.lat.toFixed(3)}°N, ${item.coordinates.lng.toFixed(3)}°E` : ''}
                                      </span>
                                    </div>

                                    <p
                                      style={{
                                        margin: '0 0 10px 0',
                                        fontSize: '0.88rem',
                                        color: 'var(--text-primary)',
                                        opacity: isCompleted ? 0.82 : 1,
                                      }}
                                    >
                                      {item.description}
                                    </p>

                                    {/* Opening Hours Badge (if recorded) */}
                                    {item.openingHours && (
                                      <div
                                        style={{
                                          fontSize: '0.75rem',
                                          color: 'var(--color-cypress)',
                                          backgroundColor: 'rgba(38, 70, 83, 0.08)',
                                          padding: '4px 8px',
                                          borderRadius: 'var(--radius-sm)',
                                          marginBottom: '8px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                        }}
                                      >
                                        <Clock size={12} /> {item.openingHours}
                                      </div>
                                    )}

                                    {/* Transit buffer from previous stop */}
                                    {item.transitFromPrevious && (
                                      <div
                                        style={{
                                          fontSize: '0.75rem',
                                          color: 'var(--text-muted)',
                                          borderTop: '1px dotted var(--color-bamboo)',
                                          paddingTop: '6px',
                                          marginBottom: '6px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          flexWrap: 'wrap',
                                          gap: '4px',
                                        }}
                                      >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                          {item.transitFromPrevious.mode === 'walking'
                                            ? '🚶'
                                            : item.transitFromPrevious.mode === 'driving'
                                            ? '🚕'
                                            : item.transitFromPrevious.mode === 'bicycling'
                                            ? '🚲'
                                            : '🚇'}{' '}
                                          <strong style={{ textTransform: 'capitalize' }}>
                                            {item.transitFromPrevious.mode}:
                                          </strong>{' '}
                                          ~{item.transitFromPrevious.estimatedMinutes} min (~
                                          {item.transitFromPrevious.distanceKm.toFixed(1)} km)
                                        </span>
                                        <span
                                          style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 700,
                                            padding: '1px 6px',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: item.transitFromPrevious.liveTrafficVerified
                                              ? 'rgba(42, 157, 143, 0.15)'
                                              : 'rgba(231, 111, 81, 0.12)',
                                            color: item.transitFromPrevious.liveTrafficVerified
                                              ? 'var(--color-cypress)'
                                              : 'var(--color-wild-berry)',
                                            border: '1px solid currentColor',
                                          }}
                                        >
                                          {item.transitFromPrevious.liveTrafficVerified
                                            ? '✓ Verified Route'
                                            : 'Estimated Buffer'}
                                        </span>
                                      </div>
                                    )}

                                    {/* Timing, Duration & Cost Row */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.78rem',
                                        color: 'var(--text-muted)',
                                        borderTop: '1px dashed var(--color-bamboo)',
                                        paddingTop: '8px',
                                        flexWrap: 'wrap',
                                        gap: '6px',
                                      }}
                                    >
                                      <span>⏱️ {item.startTime} – {item.endTime} (~{item.durationMinutes} min)</span>
                                      <span style={{ fontWeight: 600 }}>
                                        {typeof item.costForGroup === 'number'
                                          ? item.costForGroup === 0
                                            ? 'Free Admission'
                                            : `${formatINR(convertUsdToInr(item.costForGroup))} total${
                                                travelers > 1
                                                  ? ` (${formatINR(convertUsdToInr(item.costForGroup / travelers))}/person)`
                                                  : ''
                                              }`
                                          : 'Admission unrecorded'}
                                      </span>
                                    </div>

                                    <div
                                      style={{
                                        fontSize: '0.75rem',
                                        fontStyle: 'italic',
                                        color: 'var(--color-blush-rose)',
                                        marginTop: '4px',
                                      }}
                                    >
                                      ✦ {item.selectionReason}
                                    </div>

                                    {/* Action Buttons: Complete Toggle & Remove */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: '10px',
                                        paddingTop: '8px',
                                        borderTop: '1px dashed var(--border-color)',
                                        gap: '8px',
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => toggleItemCompleted(item.id)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          padding: '5px 12px',
                                          borderRadius: 'var(--radius-sm)',
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          border: isCompleted ? '1px solid var(--color-cypress)' : '1px solid var(--border-color)',
                                          backgroundColor: isCompleted ? 'var(--color-cypress)' : 'var(--color-vanilla-custard)',
                                          color: isCompleted ? '#FFFFFF' : 'var(--text-primary)',
                                          transition: 'all 150ms ease',
                                        }}
                                      >
                                        <Check size={13} />
                                        {isCompleted ? 'Completed' : 'Mark Done'}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => removeItem(item.id, item.title, dayPlan.dayNumber)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 8px',
                                          borderRadius: 'var(--radius-sm)',
                                          fontSize: '0.72rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          border: '1px solid transparent',
                                          backgroundColor: 'transparent',
                                          color: 'var(--color-wild-berry)',
                                          transition: 'all 150ms ease',
                                        }}
                                        title="Remove from itinerary"
                                      >
                                        <Trash2 size={12} />
                                        Remove
                                      </button>
                                    </div>
                                  </PaperCard>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Overall Cost & Exclusion Note Box (Live Recalculated) */}
                  <div
                    style={{
                      backgroundColor: 'var(--color-vanilla-custard)',
                      border: '1px dashed var(--color-chrysanthemum)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <span>
                          Total Trip Cost ({days} {days === 1 ? 'day' : 'days'}, {travelers}{' '}
                          {travelers === 1 ? 'traveller' : 'travellers'}):
                        </span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                          {allActiveItems.length} active {allActiveItems.length === 1 ? 'stop' : 'stops'}
                          {totalCompletedCount > 0 ? ` · ${totalCompletedCount} completed` : ''}
                          {removedItemIds.size > 0 ? ` · ${removedItemIds.size} removed` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'flex-end' }}>
                          <span style={{ color: 'var(--color-cypress)', fontSize: '1.15rem', fontWeight: 800 }}>
                            {formatINR(convertUsdToInr(totalTripCostUsd))}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            / {formatINR(budgetInr)} Allocated Budget
                          </span>
                        </div>
                        {travelers > 1 && totalTripCostUsd > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatINR(convertUsdToInr(totalTripCostUsd / travelers))} per traveller
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Itinerary plan quick actions bar */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        id="undo-last-plan-btn-bottom"
                        onClick={undoLastPlan}
                        disabled={historySize === 0}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: historySize > 0 ? 'transparent' : 'rgba(0, 0, 0, 0.03)',
                          color: historySize > 0 ? 'var(--color-cypress)' : 'var(--text-muted)',
                          border: historySize > 0 ? '1px solid var(--color-cypress)' : '1px solid var(--border-color)',
                          cursor: historySize > 0 ? 'pointer' : 'not-allowed',
                          opacity: historySize > 0 ? 1 : 0.5,
                        }}
                        title={
                          historySize > 0
                            ? `Restore previous itinerary plan (${historySize} in stack)`
                            : 'No previous plan in history to restore'
                        }
                      >
                        <Undo2 size={12} />
                        Undo Last Plan{historySize > 0 ? ` (${historySize})` : ''}
                      </button>
                      {removedItemIds.size > 0 && (
                        <button
                          type="button"
                          onClick={restoreAllItems}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 12px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'transparent',
                            color: 'var(--color-cypress)',
                            border: '1px solid var(--color-cypress)',
                            cursor: 'pointer',
                          }}
                        >
                          <Undo2 size={12} />
                          Restore All ({removedItemIds.size} removed)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={regenerateItinerary}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: 'transparent',
                          color: 'var(--color-cypress)',
                          border: '1px solid var(--color-cypress)',
                          cursor: 'pointer',
                        }}
                      >
                        <RotateCw size={12} />
                        Regenerate Itinerary
                      </button>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                      📌 {comprehensivePlan.disclaimerNote}
                    </div>
                    {comprehensivePlan.unrecordedDataFlags.notes.map((note, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', color: 'var(--color-blush-rose)' }}>
                        ℹ️ {note}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* 
          ==================================================
          TAB 1B: ATTRACTIONS VIEW (LIVE OPENTRIPMAP / CURATED FALLBACK)
          ==================================================
        */}
        {activeTab === 'attractions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Live vs Curated Provenance Banner */}
            {places.some((p) => p.provenance === 'verified_provider') ? (
              <div
                style={{
                  backgroundColor: 'rgba(42, 157, 143, 0.12)',
                  border: '1px solid var(--color-cypress)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-cypress)',
                  fontSize: '0.85rem',
                }}
              >
                <Landmark size={20} style={{ color: 'var(--color-cypress)', flexShrink: 0 }} />
                <div>
                  <strong>Live OpenTripMap Feed Active:</strong> Showing real attractions retrieved via
                  OpenTripMap's verified API feed for <strong>{dest.name}</strong>.
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'rgba(231, 111, 81, 0.12)',
                  border: '1px solid var(--color-princeton-orange)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-wild-berry)',
                  fontSize: '0.85rem',
                }}
              >
                <Info size={20} style={{ color: 'var(--color-princeton-orange)', flexShrink: 0 }} />
                <div>
                  <strong>Curated Heritage Catalog:</strong> Live OpenTripMap API credentials
                  (<code>OPENTRIPMAP_API_KEY</code>) are unconfigured on the server or returned no records.
                  Displaying Ryoko's verified curated cultural catalog for <strong>{dest.name}</strong>.
                </div>
              </div>
            )}

            {placesError && (
              <div
                style={{
                  backgroundColor: 'rgba(231, 111, 81, 0.12)',
                  border: '1px solid var(--color-blush-rose)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--color-blush-rose)',
                  fontSize: '0.82rem',
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>Live Feed Notice: {placesError}. Curated backup catalog loaded below.</span>
              </div>
            )}

            {placesLoading ? (
              <PaperCard stampText="FETCHING PLACES">
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)' }}>
                  <RotateCw size={32} className="animate-spin" style={{ color: 'var(--color-cypress)', margin: '0 auto 12px auto' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Loading attractions for {dest.name}...
                  </p>
                </div>
              </PaperCard>
            ) : places.length === 0 ? (
              <PaperCard stampText="ATTRACTIONS">
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)' }}>
                  <Landmark size={36} style={{ color: 'var(--color-bamboo)', margin: '0 auto 12px auto' }} />
                  <h4
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      margin: '0 0 8px 0',
                      fontSize: '1.25rem',
                      color: 'var(--text-heading)',
                    }}
                  >
                    No Attractions Cataloged for {dest.name}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      color: 'var(--text-muted)',
                      maxWidth: '480px',
                      marginInline: 'auto',
                    }}
                  >
                    No verified attraction records are currently available for this destination. When OpenTripMap is
                    configured, live points of interest are mapped automatically.
                  </p>
                </div>
              </PaperCard>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
                  gap: 'var(--space-lg)',
                }}
              >
                {places.map((place) => {
                  const stampLabel =
                    typeof place.estimatedCostPerPerson === 'number' && place.isAdmissionRecorded
                      ? place.estimatedCostPerPerson === 0
                        ? 'FREE ADMISSION'
                        : `${formatINR(convertUsdToInr(place.estimatedCostPerPerson))} / PERSON`
                      : 'ADMISSION UNRECORDED';

                  return (
                    <PaperCard key={place.id} stampText={stampLabel}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                        <Landmark size={20} style={{ color: 'var(--color-cypress)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <h4
                            style={{
                              fontFamily: 'var(--font-family-serif)',
                              margin: 0,
                              fontSize: '1.15rem',
                              color: 'var(--text-heading)',
                            }}
                          >
                            {place.name}
                          </h4>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                backgroundColor:
                                  place.provenance === 'verified_provider'
                                    ? 'rgba(42, 157, 143, 0.15)'
                                    : 'var(--color-vanilla-custard)',
                                color:
                                  place.provenance === 'verified_provider'
                                    ? 'var(--color-cypress)'
                                    : 'var(--text-muted)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              {place.provenance === 'verified_provider' ? 'Live Provider' : 'Curated Catalog'}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                backgroundColor: 'var(--color-vanilla-custard)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              {place.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p
                        style={{
                          fontSize: '0.84rem',
                          color: 'var(--text-primary)',
                          lineHeight: 1.45,
                          margin: '8px 0 10px 0',
                        }}
                      >
                        {place.description}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          borderTop: '1px dashed var(--color-bamboo)',
                          paddingTop: '8px',
                          flexWrap: 'wrap',
                          gap: '6px',
                        }}
                      >
                        <span>Duration: ~{place.estimatedDurationMinutes} min</span>
                        <span>
                          {typeof place.estimatedCostPerPerson === 'number' && place.isAdmissionRecorded
                            ? place.estimatedCostPerPerson === 0
                              ? 'Free Admission'
                              : `${formatINR(convertUsdToInr(place.estimatedCostPerPerson))} (~$${place.estimatedCostPerPerson} USD)`
                            : 'Admission Unrecorded'}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: '0.70rem',
                          color: 'var(--text-muted)',
                          fontStyle: 'italic',
                          marginTop: '6px',
                          borderTop: '1px dashed var(--border-color)',
                          paddingTop: '6px',
                        }}
                      >
                        Source: {place.sourceAttribution}
                      </div>
                    </PaperCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 
          ==================================================
          TAB 2: FLIGHTS VIEW (WITH LIVE AMADEUS & PROVENANCE)
          ==================================================
        */}
        {activeTab === 'flights' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Origin Airport & Flight Controls Bar */}
            <div
              style={{
                backgroundColor: 'var(--color-parchment)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                  Origin Hub:
                </span>
                {['JFK', 'LHR', 'BOM', 'DEL', 'SIN', 'HND'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setOriginAirport(code);
                      handleRefreshFlights(code);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: originAirport === code ? 700 : 500,
                      backgroundColor: originAirport === code ? 'var(--color-cypress)' : '#FFFFFF',
                      color: originAirport === code ? '#FFFFFF' : 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                    }}
                  >
                    {code}
                  </button>
                ))}
                <input
                  type="text"
                  maxLength={4}
                  value={originAirport}
                  onChange={(e) => setOriginAirport(e.target.value.toUpperCase())}
                  placeholder="IATA"
                  style={{
                    width: '64px',
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>📅 Departure: {startDate}</span>
                <span>👥 {travelers} {travelers === 1 ? 'traveler' : 'travelers'}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRefreshFlights(originAirport)}
                  disabled={flightsLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RotateCw size={14} className={flightsLoading ? 'animate-spin' : ''} />
                  {flightsLoading ? 'Searching...' : 'Refresh Flights'}
                </Button>
              </div>
            </div>

            {/* Provenance Status Banner */}
            {flightResponse?.liveFareVerified && !flightResponse?.isMock ? (
              <div
                style={{
                  backgroundColor: 'rgba(42, 157, 143, 0.12)',
                  border: '1px solid var(--color-cypress)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-cypress)',
                  fontSize: '0.85rem',
                }}
              >
                <CheckCircle2 size={20} style={{ color: 'var(--color-cypress)', flexShrink: 0 }} />
                <div>
                  <strong>Live Flight Provider Active:</strong> Real-time airline offers and verified fares retrieved via {flightResponse.sourceAttribution || 'Amadeus Global Travel Network'}.
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'rgba(231, 111, 81, 0.12)',
                  border: '1px solid var(--color-princeton-orange)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-wild-berry)',
                  fontSize: '0.85rem',
                }}
              >
                <Info size={20} style={{ color: 'var(--color-princeton-orange)', flexShrink: 0 }} />
                <div>
                  <strong>Development Simulated Flights:</strong> {flightResponse?.warning || 'AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET unconfigured on server. Displaying realistic simulated airline inventory and indicative fare estimates.'}
                </div>
              </div>
            )}

            {/* Error Message if present */}
            {flightsError && (
              <div
                style={{
                  backgroundColor: 'rgba(230, 57, 70, 0.1)',
                  border: '1px solid #E63946',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  color: '#9E2A2B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>⚠️ {flightsError}</span>
                <Button size="sm" variant="ghost" onClick={() => handleRefreshFlights(originAirport)}>
                  Retry
                </Button>
              </div>
            )}

            {flightsLoading ? (
              <PaperCard stampText="QUERYING AIRLINES">
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)' }}>
                  <RotateCw size={36} className="animate-spin" style={{ color: 'var(--color-cypress)', margin: '0 auto 12px auto' }} />
                  <h4 style={{ fontFamily: 'var(--font-family-serif)', margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text-heading)' }}>
                    Searching Flight Inventory...
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Connecting to flight provider for {originAirport} ➔ {dest.name} departures.
                  </p>
                </div>
              </PaperCard>
            ) : flights.length === 0 ? (
              <PaperCard stampText="FLIGHT SCHEDULES">
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)' }}>
                  <Plane size={36} style={{ color: 'var(--color-bamboo)', margin: '0 auto 12px auto' }} />
                  <h4
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      margin: '0 0 8px 0',
                      fontSize: '1.25rem',
                      color: 'var(--text-heading)',
                    }}
                  >
                    No Flight Schedules Found for {originAirport} ➔ {dest.name}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      color: 'var(--text-muted)',
                      maxWidth: '480px',
                      marginInline: 'auto',
                    }}
                  >
                    Try choosing a different origin hub (e.g. JFK, LHR, BOM, DEL) or adjust your departure date. Live airline GDS booking APIs can be connected via AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET.
                  </p>
                </div>
              </PaperCard>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 'var(--space-lg)',
                }}
              >
                {flights.map((flt) => (
                  <PaperCard key={flt.id} stampText={flt.liveFareVerified ? `LIVE ${formatINR(convertUsdToInr(flt.estimatedPriceUsd))}` : `EST. ${formatINR(convertUsdToInr(flt.estimatedPriceUsd))}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plane size={20} style={{ color: 'var(--color-cypress)' }} />
                        <h4
                          style={{
                            fontFamily: 'var(--font-family-serif)',
                            margin: 0,
                            fontSize: '1.15rem',
                            color: 'var(--text-heading)',
                          }}
                        >
                          {flt.carrier}
                        </h4>
                      </div>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: flt.liveFareVerified ? 'rgba(42, 157, 143, 0.15)' : 'rgba(231, 111, 81, 0.15)',
                          color: flt.liveFareVerified ? 'var(--color-cypress)' : 'var(--color-wild-berry)',
                          border: `1px solid ${flt.liveFareVerified ? 'var(--color-cypress)' : 'var(--color-princeton-orange)'}`,
                        }}
                      >
                        {flt.liveFareVerified ? 'VERIFIED LIVE' : 'SIMULATED'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Flight {flt.flightNumber} · {flt.cabinClass.toUpperCase()}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: '10px 0',
                      }}
                    >
                      <span>
                        {flt.originAirport} ({flt.originCity})
                      </span>
                      <span style={{ color: 'var(--color-princeton-orange)' }}>➔</span>
                      <span>
                        {flt.destinationAirport} ({flt.destinationCity})
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        borderTop: '1px dashed var(--color-bamboo)',
                        paddingTop: '8px',
                      }}
                    >
                      <span>⏱️ Duration: ~{Math.round(flt.durationMinutes / 60)}h {flt.durationMinutes % 60}m</span>
                      <span>{flt.stops === 0 ? 'Direct Nonstop' : `${flt.stops} stop`}</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        marginTop: '6px',
                        borderTop: '1px dashed var(--border-color)',
                        paddingTop: '6px',
                      }}
                    >
                      <span>Dep: {flt.departureTime}</span>
                      <span style={{ fontWeight: 600 }}>Indicative: ~${flt.estimatedPriceUsd} {flt.currency}</span>
                    </div>
                  </PaperCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 
          ==================================================
          TAB 3: HOTELS VIEW (WITH STAY PRICING & PROVENANCE)
          ==================================================
        */}
        {activeTab === 'hotels' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Stay Summary Bar */}
            <div
              style={{
                backgroundColor: 'var(--color-parchment)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                <span><strong>Check-in:</strong> {startDate}</span>
                <span><strong>Duration:</strong> {days} {days === 1 ? 'night' : 'nights'}</span>
                <span><strong>Guests:</strong> {travelers} {travelers === 1 ? 'guest' : 'guests'}</span>
                <span><strong>Budget:</strong> {formatINR(budgetInr)} (~${budgetUsd})</span>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefreshHotels}
                disabled={hotelsLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RotateCw size={14} className={hotelsLoading ? 'animate-spin' : ''} />
                {hotelsLoading ? 'Searching...' : 'Refresh Stays'}
              </Button>
            </div>

            {/* Provenance Status Banner */}
            {hotelResponse?.liveAvailabilityVerified && !hotelResponse?.isMock ? (
              <div
                style={{
                  backgroundColor: 'rgba(42, 157, 143, 0.12)',
                  border: '1px solid var(--color-cypress)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-cypress)',
                  fontSize: '0.85rem',
                }}
              >
                <CheckCircle2 size={20} style={{ color: 'var(--color-cypress)', flexShrink: 0 }} />
                <div>
                  <strong>Live Hospitality Provider Active:</strong> Real-time room availability and verified rates retrieved via {hotelResponse.sourceAttribution || 'Partner Hospitality Network'}.
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'rgba(231, 111, 81, 0.12)',
                  border: '1px solid var(--color-princeton-orange)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-wild-berry)',
                  fontSize: '0.85rem',
                }}
              >
                <Info size={20} style={{ color: 'var(--color-princeton-orange)', flexShrink: 0 }} />
                <div>
                  <strong>Development Simulated Lodging:</strong> {hotelResponse?.warning || 'HOTEL_PROVIDER_API_KEY unconfigured on server. Curated accommodations and simulated nightly room rates active.'}
                </div>
              </div>
            )}

            {/* Error Message if present */}
            {hotelsError && (
              <div
                style={{
                  backgroundColor: 'rgba(230, 57, 70, 0.1)',
                  border: '1px solid #E63946',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  color: '#9E2A2B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>⚠️ {hotelsError}</span>
                <Button size="sm" variant="ghost" onClick={handleRefreshHotels}>
                  Retry
                </Button>
              </div>
            )}

            {hotelsLoading ? (
              <PaperCard stampText="QUERYING LODGING">
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)' }}>
                  <RotateCw size={36} className="animate-spin" style={{ color: 'var(--color-cypress)', margin: '0 auto 12px auto' }} />
                  <h4 style={{ fontFamily: 'var(--font-family-serif)', margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text-heading)' }}>
                    Searching Accommodations...
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Retrieving lodging options and nightly rates for {dest.name}.
                  </p>
                </div>
              </PaperCard>
            ) : hotels.length === 0 ? (
              <PaperCard stampText="ACCOMMODATION">
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)' }}>
                  <Home size={36} style={{ color: 'var(--color-bamboo)', margin: '0 auto 12px auto' }} />
                  <h4
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      margin: '0 0 8px 0',
                      fontSize: '1.25rem',
                      color: 'var(--text-heading)',
                    }}
                  >
                    No Lodging Records Found for {dest.name}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      color: 'var(--text-muted)',
                      maxWidth: '480px',
                      marginInline: 'auto',
                    }}
                  >
                    Curated lodging simulations are available for our primary hub destinations. Live hotel booking
                    APIs can be integrated via HOTEL_PROVIDER_API_KEY.
                  </p>
                </div>
              </PaperCard>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 'var(--space-lg)',
                }}
              >
                {hotels.map((htl) => {
                  const nightlyInr = convertUsdToInr(htl.estimatedPricePerNightUsd);
                  const totalStayInr = convertUsdToInr(htl.totalStayPriceUsd || (htl.estimatedPricePerNightUsd * days));
                  return (
                    <PaperCard key={htl.id} stampText={`${formatINR(nightlyInr)} / NIGHT`}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Home size={20} style={{ color: 'var(--color-cypress)' }} />
                          <div>
                            <h4
                              style={{
                                fontFamily: 'var(--font-family-serif)',
                                margin: 0,
                                fontSize: '1.15rem',
                                color: 'var(--text-heading)',
                              }}
                            >
                              {htl.name}
                            </h4>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-princeton-orange)', fontWeight: 700 }}>
                              {'★'.repeat(htl.starRating)} · {htl.tier.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: htl.liveAvailabilityVerified ? 'rgba(42, 157, 143, 0.15)' : 'rgba(231, 111, 81, 0.15)',
                            color: htl.liveAvailabilityVerified ? 'var(--color-cypress)' : 'var(--color-wild-berry)',
                            border: `1px solid ${htl.liveAvailabilityVerified ? 'var(--color-cypress)' : 'var(--color-princeton-orange)'}`,
                          }}
                        >
                          {htl.liveAvailabilityVerified ? 'VERIFIED LIVE' : 'SIMULATED'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        📍 {htl.neighborhood} · {htl.address}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                        {htl.amenities.slice(0, 3).map((am, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.72rem',
                              backgroundColor: 'var(--color-vanilla-custard)',
                              border: '1px solid var(--border-color)',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {am}
                          </span>
                        ))}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          borderTop: '1px dashed var(--color-bamboo)',
                          paddingTop: '8px',
                        }}
                      >
                        <span>Check-in: {htl.checkInTime}</span>
                        <span>Rating: {htl.ratingScore} / 5.0</span>
                      </div>

                      {/* Explicit Stay Pricing Breakdown */}
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-primary)',
                          marginTop: '8px',
                          borderTop: '1px dashed var(--border-color)',
                          paddingTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>Stay Total ({days} {days === 1 ? 'night' : 'nights'}):</span>
                          <span style={{ color: 'var(--color-cypress)', fontWeight: 700 }}>
                            {formatINR(totalStayInr)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          <span>Base: ~${htl.estimatedPricePerNightUsd} USD/night</span>
                          <span>~${htl.totalStayPriceUsd || (htl.estimatedPricePerNightUsd * days)} USD total</span>
                        </div>
                      </div>
                    </PaperCard>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* 
          ==================================================
          TAB 4: WEATHER VIEW (CLEARLY LABELLED MOCK DATA)
          ==================================================
        */}
        {activeTab === 'weather' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Live vs Mock Provenance Banner */}
            {weather && (!weather.isMock || weather.liveForecastVerified) ? (
              <div
                style={{
                  backgroundColor: 'rgba(42, 157, 143, 0.12)',
                  border: '1px solid var(--color-cypress)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-cypress)',
                  fontSize: '0.85rem',
                }}
              >
                <CloudSun size={20} style={{ color: 'var(--color-cypress)', flexShrink: 0 }} />
                <div>
                  <strong>Verified Live OpenWeather Telemetry:</strong> Live meteorological feed connected for{' '}
                  <strong>{weather.current.cityName}</strong>. Real-time conditions and 5-day forecast active.
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'rgba(231, 111, 81, 0.12)',
                  border: '1px solid var(--color-princeton-orange)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--color-wild-berry)',
                  fontSize: '0.85rem',
                }}
              >
                <Info size={20} style={{ color: 'var(--color-princeton-orange)', flexShrink: 0 }} />
                <div>
                  <strong>Simulated Regional Climatology:</strong> <code>OPENWEATHER_API_KEY</code> unconfigured on server.
                  Displaying seasonal baseline climatology for <strong>{dest.name}</strong>.
                </div>
              </div>
            )}

            {/* Weather Header & Manual Refresh Button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-family-serif)',
                    margin: 0,
                    fontSize: '1.35rem',
                    color: 'var(--text-heading)',
                  }}
                >
                  {dest.name} Meteorological Outlook
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Source: {weather?.sourceAttribution || 'Meteorological Telemetry'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshWeather}
                disabled={weatherRefreshing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--color-vanilla-custard)',
                  color: 'var(--text-primary)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <RotateCw size={14} className={weatherRefreshing ? 'animate-spin' : ''} />
                {weatherRefreshing ? 'Fetching Forecast...' : 'Refresh Live Weather & Adapt Plan'}
              </button>
            </div>

            {!weather ? (
              <PaperCard stampText="CLIMATE TELEMETRY">
                <div style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-md)' }}>
                  <CloudSun size={36} style={{ color: 'var(--color-bamboo)', margin: '0 auto 12px auto' }} />
                  <h4
                    style={{
                      fontFamily: 'var(--font-family-serif)',
                      margin: '0 0 8px 0',
                      fontSize: '1.25rem',
                      color: 'var(--text-heading)',
                    }}
                  >
                    Climatology Data Unavailable for {dest.name}
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.88rem',
                      color: 'var(--text-muted)',
                      maxWidth: '480px',
                      marginInline: 'auto',
                    }}
                  >
                    Regional climate simulations are cataloged for our primary hub destinations. Live weather feeds can
                    be connected via server-side provider adapters.
                  </p>
                </div>
              </PaperCard>
            ) : (
              <>
                {/* Current Weather Card */}
                <PaperCard stampText={weather.isMock ? 'SIMULATED CLIMATE' : 'LIVE TELEMETRY'}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          fontFamily: 'var(--font-family-serif)',
                          margin: 0,
                          fontSize: '1.5rem',
                          color: 'var(--text-heading)',
                        }}
                      >
                        {weather.current.cityName} Current Conditions
                      </h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {weather.current.conditionLabel}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-family-serif)',
                          fontSize: '2.5rem',
                          fontWeight: 700,
                          color: 'var(--color-cypress)',
                        }}
                      >
                        {weather.current.temperatureC}°C{' '}
                        <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          ({weather.current.temperatureF}°F)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Feels like {weather.current.feelsLikeC}°C · Humidity {weather.current.humidityPercent}% · Wind{' '}
                        {weather.current.windSpeedKmH} km/h
                      </div>
                    </div>
                  </div>
                </PaperCard>

                {/* 5-Day Forecast Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 'var(--space-md)',
                  }}
                >
                  {weather.forecast.map((day, idx) => (
                    <PaperCard
                      key={idx}
                      stampText={`${day.dayOfWeek.toUpperCase()} · ${!day.isMock ? 'LIVE' : 'SIMULATED'}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-heading)' }}>
                          {day.conditionLabel}
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--color-cypress)', fontSize: '1.2rem' }}>
                          {day.tempHighC}° / {day.tempLowC}°C
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          marginTop: '6px',
                          borderTop: '1px dashed var(--color-bamboo)',
                          paddingTop: '6px',
                        }}
                      >
                        Rain chance: {day.precipitationChancePercent}% · Wind: {day.windSpeedKmH} km/h · Humidity:{' '}
                        {day.humidityPercent}%
                      </div>

                      {day.advisory && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-blush-rose)',
                            fontStyle: 'italic',
                            marginTop: '6px',
                          }}
                        >
                          💡 {day.advisory}
                        </div>
                      )}
                    </PaperCard>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 
          ==================================================
          DESTINATION CATEGORIES DOCK
          ==================================================
        */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '2px solid var(--color-cypress)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            boxShadow: 'var(--shadow-postcard)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)' }}>
            <h3
              style={{
                fontFamily: 'var(--font-family-serif)',
                margin: 0,
                fontSize: '1.4rem',
                color: 'var(--text-heading)',
              }}
            >
              Explore {dest.name} Categories
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Curated recommendations for {dest.name}, {dest.country}
            </p>
          </div>

          {/* Category Tabs Pill Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: 'var(--space-md)',
            }}
          >
            {categoryLabels.map((cat) => {
              const isActive = activeCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-family-sans)',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--color-cypress)' : 'var(--color-vanilla-custard)',
                    color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                    border: isActive
                      ? '1px solid var(--color-cypress)'
                      : '1px solid var(--color-chrysanthemum)',
                    boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Icon size={14} />
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Category Items List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: 'var(--color-cream)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
              border: '1px dashed var(--color-bamboo)',
            }}
          >
            {activeCategoryItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.92rem',
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                }}
              >
                <span style={{ color: 'var(--color-princeton-orange)', fontWeight: 700 }}>✦</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Return Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-lg)' }}>
          <Button variant="primary" size="lg" icon={<Compass size={20} />} onClick={onReturnToGlobe}>
            Return to Living Globe World
          </Button>
        </div>
      </div>
    </div>
  );
};
