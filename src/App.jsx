import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar, 
  MapPin, 
  Search, 
  Heart, 
  Video, 
  Compass, 
  Map, 
  X, 
  Share2, 
  Volume2, 
  VolumeX, 
  Phone, 
  Globe, 
  ExternalLink,
  ChevronRight,
  Filter,
  Bookmark
} from 'lucide-react';
import { specialsData } from './data/specialsData';
import { supabase, isDbMocked } from './data/supabaseClient';
import ArchetypeCanvas from './components/ArchetypeCanvas';

function App() {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'explore' | 'map'
  const [activeFaq, setActiveFaq] = useState(null);
  const [exploreMode, setExploreMode] = useState('cards'); // 'cards' or 'reels'
  const [isReelsMuted, setIsReelsMuted] = useState(true);
  const [reelsDragStartY, setReelsDragStartY] = useState(0);
  const [reelsDragOffsetY, setReelsDragOffsetY] = useState(0);
  const [isReelsDragging, setIsReelsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All');
  const [favorites, setFavorites] = useState([]);
  const [savedSpecials, setSavedSpecials] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [mapSelectedRestaurant, setMapSelectedRestaurant] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [streetViewStatus, setStreetViewStatus] = useState('loading'); // 'loading' | 'ok' | 'no_imagery'
  const [mapHasBeenReset, setMapHasBeenReset] = useState(false);
  
  const streetViewRef = useRef(null);
  const panoramaRef = useRef(null);

  // ================= GEOLOCATION & HAVERSINE PROXIMITY =================
  const [userLocation, setUserLocation] = useState(null);

  // Live Geolocation watch effect
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Geolocation permission blocked or timed out. Falling back to Midtown Atlanta.");
          setUserLocation({ lat: 33.7749, lng: -84.3819 });
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    } else {
      setUserLocation({ lat: 33.7749, lng: -84.3819 });
    }
  }, []);

  // ================= DEEP LINKING ROUTE PARSER (GEO/SEO COMPLIANCE) =================
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const searchParam = params.get('search');
    const dayParam = params.get('day');
    const neighborhoodParam = params.get('neighborhood');
    const dealParam = params.get('deal');

    if (tabParam) {
      if (tabParam === 'map') {
        setActiveTab('map');
      } else if (tabParam === 'explore') {
        setActiveTab('explore');
        setExploreMode('cards');
      } else if (tabParam === 'reels') {
        setActiveTab('explore');
        setExploreMode('reels');
      } else if (tabParam === 'matchmaker') {
        setActiveTab('feed');
        const defaultRest = specialsData.find(s => s.name.toLowerCase().includes('luna')) || specialsData[0];
        setDateRestaurant(defaultRest);
        setShowDateFlow(true);
        setDateFlowStep('intro');
      }
    }

    if (searchParam) {
      setSearchQuery(searchParam);
    }
    if (dayParam) {
      const formattedDay = dayParam.charAt(0).toUpperCase() + dayParam.slice(1).toLowerCase();
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      if (days.includes(formattedDay)) {
        setSelectedDay(formattedDay);
      }
    }
    if (neighborhoodParam) {
      setSelectedNeighborhood(neighborhoodParam);
    }
    if (dealParam) {
      const cleanDealName = dealParam.replace(/_/g, ' ').toLowerCase();
      const targetDeal = specialsData.find(s => s.name.toLowerCase() === cleanDealName || s.name.toLowerCase().includes(cleanDealName));
      if (targetDeal) {
        setSelectedRestaurant(targetDeal);
        setMapSelectedRestaurant(targetDeal);
      }
    }

    // PWA Share Target inbound query parser
    const sharedTitle = params.get('title');
    const sharedText = params.get('text');
    const sharedUrl = params.get('url');
    if (sharedTitle || sharedText || sharedUrl) {
      triggerToast("🎁 Received shared date recommendation!");
      if (sharedText) setSearchQuery(sharedText);
    }

    // PWA Natively Launched File Handler queue consumer
    if ('launchQueue' in window) {
      window.launchQueue.setConsumer((launchParams) => {
        if (launchParams.files && launchParams.files.length > 0) {
          triggerToast("📁 File loaded natively into MunchiDate!");
          console.log("Files loaded:", launchParams.files);
        }
      });
    }
  }, []);

  // ================= VIDEO CALL COUNTDOWN EFFECT =================
  useEffect(() => {
    let interval = null;
    if (videoCallTimerActive && videoCallTimer > 0) {
      interval = setInterval(() => {
        setVideoCallTimer(prev => prev - 1);
      }, 1000);
    } else if (videoCallTimerActive && videoCallTimer === 0) {
      setVideoCallTimerActive(false);
      setIsVideoCallActive(false);
      setVideoCallRatingActive(true);
      playAudioBeep(330, 0.35, 'sawtooth');
    }
    return () => clearInterval(interval);
  }, [videoCallTimerActive, videoCallTimer]);

  const handleInitiateVideoCall = () => {
    playAudioBeep(523.25, 0.08, 'sine');
    setShowVideoPaywall(true);
  };

  const handleSimulatedSwipe = () => {
    // Play payment sound triggers
    playLockChime(0);
    setTimeout(() => playLockChime(1), 80);
    setTimeout(() => playLockChime(2), 160);
    
    triggerToast("💳 Video Call Sponsor Charge of $3.00 approved via Stripe!");
    setShowVideoPaywall(false);
    setIsVideoCallConnecting(true);
    
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      playAudioBeep(650 + Math.random() * 200, 0.05, 'triangle');
      tickCount++;
      if (tickCount > 8) clearInterval(tickInterval);
    }, 180);

    setTimeout(() => {
      setIsVideoCallConnecting(false);
      setIsVideoCallActive(true);
      setVideoCallTimer(240); // Reset timer to 4 mins
      setVideoCallTimerActive(true);
      playJackpotFanfare();
    }, 2000);
  };

  // ================= DATABASE PROFILE & AUTH SYNCS =================
  // Synchronize auth state with Supabase
  useEffect(() => {
    if (isDbMocked) return;

    // Load active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        // Fall back to clean logged-out state
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setUser(data);
      } else {
        // If profile doesn't exist, create a clean profile record
        const cleanProfile = {
          id: userId,
          name: authName || "New Foodie",
          avatar_url: `/portraits/profile_${Math.floor(Math.random() * 30) + 1}.png`,
          archetype: selectedArchetype ? selectedArchetype.title : "Midnight Street Food Rebel",
          saved_spots: [],
          free_meetings_left: 1,
          is_premium: false,
          premium_since: null
        };
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(cleanProfile);
        
        if (insertError) throw insertError;
        setUser(cleanProfile);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err.message);
    }
  };

  // Sync mock user state with LocalStorage for high-fidelity offline/dev persistence
  useEffect(() => {
    if (isDbMocked) {
      const cached = localStorage.getItem('atl_mock_profile');
      if (cached) {
        try {
          setUser(JSON.parse(cached));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isDbMocked && user) {
      localStorage.setItem('atl_mock_profile', JSON.stringify(user));
    }
  }, [user]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    playAudioBeep(523.25, 0.08, 'sine');

    if (isDbMocked) {
      // High-fidelity local mock auth handler
      setTimeout(() => {
        const mockProfile = {
          name: authName || authEmail.split('@')[0] || "Foodie Explorer",
          avatar_url: `/portraits/profile_${Math.floor(Math.random() * 30) + 1}.png`,
          archetype: selectedArchetype ? selectedArchetype.title : "Midnight Street Food Rebel",
          saved_spots: savedSpecials.map(s => s.name),
          free_meetings_left: user ? user.free_meetings_left : 1,
          is_premium: user ? user.is_premium : false,
          premium_since: user ? user.premium_since : null
        };
        setUser(mockProfile);
        setAuthLoading(false);
        setShowAuthModal(false);
        triggerToast(`🎉 Authenticated successfully as ${mockProfile.name}!`);
        // Play positive sound chime
        playAudioBeep(523.25, 0.1, 'triangle');
        setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
      }, 1000);
      return;
    }

    // Real Supabase Auth execution
    try {
      if (isSignUpMode) {
        const { data: { user: authUser }, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        triggerToast("🎉 Account created! Logged in successfully.");
      } else {
        const { data: { user: authUser }, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        triggerToast("🔑 Welcome back! Logged in successfully.");
      }
      setShowAuthModal(false);
    } catch (err) {
      console.error(err);
      triggerToast(`❌ Auth error: ${err.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    playAudioBeep(440, 0.08, 'sine');
    if (isDbMocked) {
      setUser(null);
      localStorage.removeItem('atl_mock_profile');
      triggerToast("👋 Signed out successfully.");
      return;
    }
    await supabase.auth.signOut();
    triggerToast("👋 Signed out successfully.");
  };

  // Haversine Distance Formula (miles)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d.toFixed(1); // One decimal precision e.g. "1.4"
  };

  // ================= CASINO SLOT MACHINE DEAL GRABBER STATES =================
  const slotEmojis = ['🌮', '🍔', '🍕', '🍹', '🍺', '🍣', '🥗', '🍗', '🍜', '🍤'];
  
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotSpinning, setSlotSpinning] = useState(false);
  const [slotLeverPulled, setSlotLeverPulled] = useState(false);
  
  const [reel1, setReel1] = useState('❓');
  const [reel2, setReel2] = useState('❓');
  const [reel3, setReel3] = useState('❓');
  
  const [slotWinnerDeal, setSlotWinnerDeal] = useState(null);
  const [slotStatusText, setSlotStatusText] = useState('PULL THE LEVER TO SPIN!');
  const [slotTickerText, setSlotTickerText] = useState('🎰 READY TO PARSE DAILY SPECIALS ONLINE & OFFLINE... 🎰');
  const [slotDemoMode, setSlotDemoMode] = useState(true); // default to true so developers/users can test instantly
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  // ================= AI MATCHMAKING & CALENDAR DATE UNLOCK STATES =================
  const [showDateFlow, setShowDateFlow] = useState(false);
  const [dateRestaurant, setDateRestaurant] = useState(null);
  
  // Step workflow tracker: 'intro' | 'quiz' | 'scanning' | 'matches' | 'revealed' | 'chat'
  const [dateFlowStep, setDateFlowStep] = useState('intro');
  const [dateQuizQuestionIndex, setDateQuizQuestionIndex] = useState(0);
  const [dateQuizAnswers, setDateQuizAnswers] = useState({});
  const [dateMatchedCandidates, setDateMatchedCandidates] = useState([]);
  const [dateSelectedMatch, setDateSelectedMatch] = useState(null);
  const [datePickedCalendarDate, setDatePickedCalendarDate] = useState(null);
  const [dateInviteText, setDateInviteText] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isTypingChat, setIsTypingChat] = useState(false);
  const [matchmakerPreference, setMatchmakerPreference] = useState('M4F');
  const [datePassAddedToCalendar, setDatePassAddedToCalendar] = useState(false);
  const [isScanningDates, setIsScanningDates] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showDesktopPrompt, setShowDesktopPrompt] = useState(false);
  
  // ================= VIRAL GROWTH LOOPS STATE =================
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [showArchetypeModal, setShowArchetypeModal] = useState(false);
  const [hasVotedDebate, setHasVotedDebate] = useState(false);
  const [debateVotes, setDebateVotes] = useState({ option1: 184, option2: 67 }); 
  const [isRegisteredGoldenTicket, setIsRegisteredGoldenTicket] = useState(false);
  const [showDatePassModal, setShowDatePassModal] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [referralCodeEntered, setReferralCodeEntered] = useState(false);
  const [showReferralVoucher, setShowReferralVoucher] = useState(false);
  const [isGuestJoined, setIsGuestJoined] = useState(false);

  // ================= VIDEO CHAT & DATE APPROVAL STATES =================
  const [isDateApprovedByBoth, setIsDateApprovedByBoth] = useState(false);
  const [showVideoPaywall, setShowVideoPaywall] = useState(false);
  const [isVideoCallConnecting, setIsVideoCallConnecting] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [videoCallTimer, setVideoCallTimer] = useState(240); // 4 minutes
  const [videoCallTimerActive, setVideoCallTimerActive] = useState(false);
  const [videoCallRatingActive, setVideoCallRatingActive] = useState(false);

  // ================= DATABASE, AUTH, AND STRIPE STATES =================
  const [user, setUser] = useState({
    name: "Alex Carter",
    avatar_url: "/portraits/profile_1.png",
    archetype: "Midnight Street Food Rebel",
    saved_spots: ["Loca Luna Sangria", "Ecco Midtown Pasta"],
    free_meetings_left: 1,
    is_premium: false,
    premium_since: null
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripePaymentAmount, setStripePaymentAmount] = useState(20); // default to $20 Premium subscription, can toggle to $5 single date pass
  const [stripeTargetMatch, setStripeTargetMatch] = useState(null);
  const [stripePaymentLoading, setStripePaymentLoading] = useState(false);
  const [showStripeSuccess, setShowStripeSuccess] = useState(false);

  // Stripe card form input fields
  const [stripeCardNum, setStripeCardNum] = useState('');
  const [stripeCardExpiry, setStripeCardExpiry] = useState('');
  const [stripeCardCvc, setStripeCardCvc] = useState('');
  const [stripeCardZip, setStripeCardZip] = useState('');

  // ================= SWIPABLE EXPLORE CARDS STATE =================
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState(null);

  const dateQuestions = [
    {
      q: "What is your favorite dining date specialty? 🍽️",
      options: [
        { label: "🌮 Tacos & Margaritas", val: "Mexican/Tapas" },
        { label: "🍣 Sushi & Asian Bites", val: "Sushi/Asian" },
        { label: "🍕 Sourdough Pizza & Wine", val: "Pizza/Italian" },
        { label: "🍗 Soul Food & Hot BBQ", val: "Soul Food/BBQ" },
        { label: "🍔 Gourmet Burgers & Pub Pint", val: "Burgers/Pub" }
      ]
    },
    {
      q: "What is your preferred dining ambiance/vibe? ✨",
      options: [
        { label: "🕯️ Cozy Candlelit Booth", val: "Intimate" },
        { label: "🍹 Lively Sun-Kissed Patio", val: "Patio" },
        { label: "🎵 Chic Record Lounge Beats", val: "Lounge" },
        { label: "🎱 Casual Darts & Bar Games", val: "Games" }
      ]
    },
    {
      q: "Which days are best for you to grab a meal together? 📅",
      options: [
        { label: "📅 Early Week (Mon - Wed)", val: "Mon-Wed" },
        { label: "🥂 Weekend Warmup (Thu - Fri)", val: "Thu-Fri" },
        { label: "🥞 Brunch/Dinner Weekends (Sat - Sun)", val: "Weekend" }
      ]
    },
    {
      q: "What is your date hosting/sponsorship preference? 🎟️",
      options: [
        { label: "🎟️ I'd love to fully sponsor/treat!", val: "Treat" },
        { label: "🤝 Let's split it half-and-half", val: "Split" },
        { label: "☕ Let's start with casual drinks first", val: "Drinks" }
      ]
    },
    {
      q: "Which region of Atlanta is closest/most convenient? 📍",
      options: [
        { label: "📍 Midtown / Buckhead", val: "Midtown" },
        { label: "📍 Downtown / AUC / Decatur", val: "Downtown" },
        { label: "📍 South Fulton / College Park", val: "South Fulton" },
        { label: "📍 West Midtown / Perimeter", val: "West Midtown" }
      ]
    }
  ];

  const simulatedProfiles = [
    {
      name: 'Marcus',
      age: 28,
      gender: 'male',
      neighborhood: 'Midtown',
      bio: "Sushi lover & local IPA collector. Looking for a Wednesday night dining buddy!",
      favoriteFood: 'Sushi & Beer 🍣',
      image: '/portraits/profile_1.png',
      categories: ['Sushi/Asian', 'Lounge', 'Mon-Wed', 'Split', 'Midtown']
    },
    {
      name: 'Liam',
      age: 22,
      gender: 'male',
      neighborhood: 'West Midtown',
      bio: "Trivia fan & dart board champion. Let's tackle Wing Wednesdays together!",
      favoriteFood: 'Burgers & Pub 🍔',
      image: '/portraits/profile_2.png',
      categories: ['Burgers/Pub', 'Games', 'Mon-Wed', 'Split', 'West Midtown']
    },
    {
      name: 'Darnell',
      age: 35,
      gender: 'male',
      neighborhood: 'South Fulton',
      bio: "Soul food connoisseur. Big Daddy's mac & cheese is undefeated. Let's coordinate a weekend brunch!",
      favoriteFood: 'Soul Food & BBQ 🍗',
      image: '/portraits/profile_3.png',
      categories: ['Soul Food/BBQ', 'Games', 'Weekend', 'Treat', 'South Fulton']
    },
    {
      name: 'Brandon',
      age: 42,
      gender: 'male',
      neighborhood: 'Buckhead',
      bio: "Steak fan & classic Manhattan appreciator. Let's treat ourselves to fine dining this week!",
      favoriteFood: 'Steak & Cocktails 🍸',
      image: '/portraits/profile_4.png',
      categories: ['Burgers/Pub', 'Lounge', 'Thu-Fri', 'Treat', 'Midtown']
    },
    {
      name: 'Ethan',
      age: 27,
      gender: 'male',
      neighborhood: 'Downtown',
      bio: "Taco enthusiast & spicy margarita critic. Looking for a high-value taco crawl!",
      favoriteFood: 'Tacos & Margaritas 🌮',
      image: '/portraits/profile_5.png',
      categories: ['Mexican/Tapas', 'Patio', 'Mon-Wed', 'Split', 'Downtown']
    },
    {
      name: 'Tyler',
      age: 24,
      gender: 'male',
      neighborhood: 'Decatur',
      bio: "Pizza nerd & record collector. Sourdough crust and vintage jazz make the perfect date.",
      favoriteFood: 'Pizza & Beer 🍕',
      image: '/portraits/profile_6.png',
      categories: ['Pizza/Italian', 'Intimate', 'Thu-Fri', 'Drinks', 'Downtown']
    },
    {
      name: 'Austin',
      age: 53,
      gender: 'male',
      neighborhood: 'Sandy Springs',
      bio: "Seafood lover & wine collector. Looking for a premium patio dinner to chat and relax.",
      favoriteFood: 'Seafood & Wine 🍷',
      image: '/portraits/profile_7.png',
      categories: ['Sushi/Asian', 'Patio', 'Weekend', 'Treat', 'West Midtown']
    },
    {
      name: 'Justin',
      age: 46,
      gender: 'male',
      neighborhood: 'Dunwoody',
      bio: "Tapas fan. Let's check out some cozy Spanish cava flights after a long workday.",
      favoriteFood: 'Tapas & Sangria 🍹',
      image: '/portraits/profile_8.png',
      categories: ['Mexican/Tapas', 'Lounge', 'Thu-Fri', 'Split', 'West Midtown']
    },
    {
      name: 'Jordan',
      age: 38,
      gender: 'male',
      neighborhood: 'Roswell',
      bio: "Burger enthusiast & hiking fan. Let's meet up for double cheese sliders and deep talks.",
      favoriteFood: 'Gourmet Burgers 🍔',
      image: '/portraits/profile_9.png',
      categories: ['Burgers/Pub', 'Games', 'Weekend', 'Drinks', 'West Midtown']
    },
    {
      name: 'Christian',
      age: 30,
      gender: 'male',
      neighborhood: 'Alpharetta',
      bio: "Sushi connoisseur. Always down for hand rolls and premium cold sake in Alpharetta.",
      favoriteFood: 'Sushi Rolls 🍣',
      image: '/portraits/profile_10.png',
      categories: ['Sushi/Asian', 'Intimate', 'Mon-Wed', 'Treat', 'West Midtown']
    },
    {
      name: 'Malik',
      age: 58,
      gender: 'male',
      neighborhood: 'AUC',
      bio: "Soul food lover. Searching for the best peach cobbler in the city. Let's check out AUC spots!",
      favoriteFood: 'Soul Food 🍗',
      image: '/portraits/profile_11.png',
      categories: ['Soul Food/BBQ', 'Patio', 'Mon-Wed', 'Split', 'Downtown']
    },
    {
      name: 'Elijah',
      age: 25,
      gender: 'male',
      neighborhood: 'College Park',
      bio: "Active sports fan & wing enthusiast. Let's grab margaritas and talk basketball.",
      favoriteFood: 'Wings & Tacos 🌮',
      image: '/portraits/profile_12.png',
      categories: ['Mexican/Tapas', 'Games', 'Thu-Fri', 'Drinks', 'South Fulton']
    },
    {
      name: 'Caleb',
      age: 49,
      gender: 'male',
      neighborhood: 'Midtown',
      bio: "Pasta romantic. Candlelit cozy dinner with authentic Carbonara is my absolute dream date.",
      favoriteFood: 'Italian Pasta 🍝',
      image: '/portraits/profile_13.png',
      categories: ['Pizza/Italian', 'Intimate', 'Thu-Fri', 'Split', 'Midtown']
    },
    {
      name: 'Ryan',
      age: 33,
      gender: 'male',
      neighborhood: 'West Midtown',
      bio: "Craft draft lover. Up for local IPAs, spicy wings, and sun-kissed patio conversations.",
      favoriteFood: 'Draft Beers & Wings 🍻',
      image: '/portraits/profile_14.png',
      categories: ['Burgers/Pub', 'Patio', 'Mon-Wed', 'Drinks', 'West Midtown']
    },
    {
      name: 'Xavier',
      age: 60,
      gender: 'male',
      neighborhood: 'Buckhead',
      bio: "Fine dining explorer. Seeking an elegant partner to share high-end tapas and craft cocktails.",
      favoriteFood: 'Fine Tapas 🍤',
      image: '/portraits/profile_15.png',
      categories: ['Mexican/Tapas', 'Lounge', 'Weekend', 'Treat', 'Midtown']
    },
    {
      name: 'Elena',
      age: 26,
      gender: 'female',
      neighborhood: 'Midtown',
      bio: "Taco enthusiast & spicy margarita critic. Let's grab 99c Sangrias at Loca Luna!",
      favoriteFood: 'Mexican & Tapas 🌮',
      image: '/portraits/profile_16.png',
      categories: ['Mexican/Tapas', 'Patio', 'Mon-Wed', 'Treat', 'Midtown']
    },
    {
      name: 'Sophia',
      age: 21,
      gender: 'female',
      neighborhood: 'Decatur',
      bio: "Italian foodie. Sourdough pizza & cozy booth talks are my love language. Meet me at Dolos!",
      favoriteFood: 'Pizza & Wine 🍕',
      image: '/portraits/profile_17.png',
      categories: ['Pizza/Italian', 'Intimate', 'Thu-Fri', 'Split', 'Downtown']
    },
    {
      name: 'Aisha',
      age: 34,
      gender: 'female',
      neighborhood: 'Inman Park',
      bio: "Cocktail mixologist & tapas finder. Happy to explore Ponce City Market Spanish cava flights!",
      favoriteFood: 'Tapas & Cocktails 🍹',
      image: '/portraits/profile_18.png',
      categories: ['Mexican/Tapas', 'Lounge', 'Thu-Fri', 'Treat', 'Midtown']
    },
    {
      name: 'Chloe',
      age: 41,
      gender: 'female',
      neighborhood: 'Downtown',
      bio: "Banh mi seeker & ramen collector. Let's meet at Lee's Bakery for a casual lunch date!",
      favoriteFood: 'Asian Fusion 🍜',
      image: '/portraits/profile_19.png',
      categories: ['Sushi/Asian', 'Intimate', 'Mon-Wed', 'Drinks', 'Downtown']
    },
    {
      name: 'Mia',
      age: 23,
      gender: 'female',
      neighborhood: 'West Midtown',
      bio: "Board game nerd & slider fan. Always down for casual pints, trivia nights, and high-energy dates.",
      favoriteFood: 'Burgers & Brews 🍔',
      image: '/portraits/profile_20.png',
      categories: ['Burgers/Pub', 'Games', 'Mon-Wed', 'Split', 'West Midtown']
    },
    {
      name: 'Olivia',
      age: 28,
      gender: 'female',
      neighborhood: 'Buckhead',
      bio: "Sushi fan & sake critic. Seeking a foodie who knows their way around a quality nigiri chef menu.",
      favoriteFood: 'Sushi & Sake 🍣',
      image: '/portraits/profile_21.png',
      categories: ['Sushi/Asian', 'Lounge', 'Thu-Fri', 'Treat', 'Midtown']
    },
    {
      name: 'Isabella',
      age: 51,
      gender: 'female',
      neighborhood: 'South Fulton',
      bio: "BBQ fan & sweet tea enthusiast. Let's check out South Fulton's best soul food and catch patio music.",
      favoriteFood: 'BBQ & Margaritas 🍗',
      image: '/portraits/profile_22.png',
      categories: ['Soul Food/BBQ', 'Patio', 'Weekend', 'Split', 'South Fulton']
    },
    {
      name: 'Ava',
      age: 45,
      gender: 'female',
      neighborhood: 'Sandy Springs',
      bio: "Seafood lover & sunset chaser. Looking for elegant dining, botanical cocktails, and premium vibes.",
      favoriteFood: 'Seafood & Champagne 🥂',
      image: '/portraits/profile_23.png',
      categories: ['Sushi/Asian', 'Intimate', 'Thu-Fri', 'Treat', 'West Midtown']
    },
    {
      name: 'Emma',
      age: 37,
      gender: 'female',
      neighborhood: 'Dunwoody',
      bio: "Taco hunter & mimosa fan. Let's find the best sun-kissed patio in Perimeter and split some street tacos.",
      favoriteFood: 'Tacos & Tapas 🌮',
      image: '/portraits/profile_24.png',
      categories: ['Mexican/Tapas', 'Patio', 'Mon-Wed', 'Drinks', 'West Midtown']
    },
    {
      name: 'Harper',
      age: 32,
      gender: 'female',
      neighborhood: 'Roswell',
      bio: "Pizza lover & arcade game enthusiast. Let's grab draft beers, hot pizza, and play some casual retro games.",
      favoriteFood: 'Pizza & Craft Beer 🍕',
      image: '/portraits/profile_25.png',
      categories: ['Pizza/Italian', 'Games', 'Weekend', 'Split', 'West Midtown']
    },
    {
      name: 'Evelyn',
      age: 56,
      gender: 'female',
      neighborhood: 'Alpharetta',
      bio: "Charcuterie explorer & wine expert. Cozy booth chats and upscale plates make my week.",
      favoriteFood: 'Wine & Charcuterie 🍷',
      image: '/portraits/profile_26.png',
      categories: ['Pizza/Italian', 'Lounge', 'Mon-Wed', 'Treat', 'West Midtown']
    },
    {
      name: 'Zoe',
      age: 25,
      gender: 'female',
      neighborhood: 'AUC',
      bio: "Wing connoisseur & sports enthusiast. Let's catch a game, share sliders, and talk about music.",
      favoriteFood: 'Wings & Sliders 🍗',
      image: '/portraits/profile_27.png',
      categories: ['Soul Food/BBQ', 'Games', 'Thu-Fri', 'Drinks', 'Downtown']
    },
    {
      name: 'Layla',
      age: 48,
      gender: 'female',
      neighborhood: 'College Park',
      bio: "Taco critic & outdoor lover. Let's locate the most energetic patio spots and grab refreshing drinks.",
      favoriteFood: 'Tacos & Cocktails 🌮',
      image: '/portraits/profile_28.png',
      categories: ['Mexican/Tapas', 'Patio', 'Mon-Wed', 'Split', 'South Fulton']
    },
    {
      name: 'Madison',
      age: 31,
      gender: 'female',
      neighborhood: 'Midtown',
      bio: "Romantic pasta foodie. Cozy candlelit booths and delicious handmade Italian dishes are my absolute favorites.",
      favoriteFood: 'Gourmet Pasta 🍝',
      image: '/portraits/profile_29.png',
      categories: ['Pizza/Italian', 'Intimate', 'Thu-Fri', 'Drinks', 'Midtown']
    },
    {
      name: 'Lily',
      age: 59,
      gender: 'female',
      neighborhood: 'West Midtown',
      bio: "Asian tapas collector. Searching for a fun, energetic buddy to explore trendy West Midtown cocktails.",
      favoriteFood: 'Asian Tapas 🍤',
      image: '/portraits/profile_30.png',
      categories: ['Sushi/Asian', 'Lounge', 'Weekend', 'Split', 'West Midtown']
    }
  ];

  const triggerToast = (msg) => {
    setToastMessage(msg);
    playAudioBeep(600, 0.1, 'sine');
    setTimeout(() => {
      setToastMessage('');
    }, 2800);
  };

  // Extracts the matched categories for a target restaurant to map to profile favorites
  const getRestaurantCuisine = (restaurant) => {
    if (!restaurant) return 'Burgers/Pub';
    const name = (restaurant.name || '').toLowerCase();
    const specs = (restaurant.specials || '').toLowerCase();
    
    if (name.includes('luna') || name.includes('pig') || name.includes('chicheria') || name.includes('cantina') || specs.includes('tapas') || specs.includes('taco') || specs.includes('sangria') || specs.includes('mexican')) {
      return 'Mexican/Tapas';
    }
    if (name.includes('sushi') || name.includes('kona') || name.includes('blossom') || name.includes('bakery') || specs.includes('sushi') || specs.includes('asian') || name.includes('brush') || specs.includes('ramen') || specs.includes('rolls')) {
      return 'Sushi/Asian';
    }
    if (name.includes('pizza') || name.includes('cibo') || name.includes('storico') || name.includes('ecco') || name.includes('lloyd') || specs.includes('pizza') || specs.includes('pasta') || specs.includes('flatbread')) {
      return 'Pizza/Italian';
    }
    if (name.includes('soul') || name.includes('bbq') || name.includes('paschal') || name.includes('daddy') || name.includes('party') || name.includes('conduck') || specs.includes('soul') || specs.includes('bbq') || specs.includes('cobbler') || specs.includes('jerk') || specs.includes('mac & cheese')) {
      return 'Soul Food/BBQ';
    }
    return 'Burgers/Pub'; // default fallback for pub food, wings, sliders
  };

  // Helper to determine custom Foodie Archetype Card based on user answers
  const getFoodieArchetype = (answers) => {
    const specialty = answers[0] || 'Mexican/Tapas';
    const ambiance = answers[1] || 'Intimate';
    const host = answers[3] || 'Split';
    
    if (specialty === 'Mexican/Tapas' || specialty === 'Burgers/Pub') {
      if (host === 'Treat') {
        return {
          title: "Generous Taco Baron 🌮",
          description: "You love high-energy dining, vibrant flavors, and fully treating your match to pitchers of margaritas and gourmet sliders!",
          tagline: "Vibrant & Generous",
          emoji: "🌮",
          color: "from-amber-400 via-orange-500 to-red-500"
        };
      }
      return {
        title: "Midnight Street Food Rebel 🍕",
        description: "A lover of late-night casual spots, high-volume wings, and lively bar games. You believe dating should be laid-back and authentic!",
        tagline: "Casual & Adventurous",
        emoji: "🍕",
        color: "from-pink-500 via-purple-500 to-indigo-500"
      };
    }
    
    if (specialty === 'Sushi/Asian') {
      if (ambiance === 'Intimate' || ambiance === 'Lounge') {
        return {
          title: "Chic Sushi Connoisseur 🍣",
          description: "Sophisticated and selective. You prefer moody candlelit booths, fresh sashimi, record lounge beats, and sharing high-end culinary tastes.",
          tagline: "Sophisticated & Moody",
          emoji: "🍣",
          color: "from-cyan-400 via-blue-500 to-indigo-600"
        };
      }
      return {
        title: "K-BBQ Grill Master 🥢",
        description: "You thrive in lively interactive spaces. For you, the ultimate date is grilling premium meats, drinking soju, and building rich conversations.",
        tagline: "Lively & Social",
        emoji: "🥢",
        color: "from-emerald-400 via-teal-500 to-cyan-500"
      };
    }
    
    if (specialty === 'Soul Food/BBQ') {
      return {
        title: "Comfort Food General 🍗",
        description: "You cherish warm, deep, authentic southern hospitality, slow-smoked ribs, golden mac & cheese, and dates filled with soulful laughter.",
        tagline: "Warm & Hearty",
        emoji: "🍗",
        color: "from-yellow-400 via-orange-500 to-pink-500"
      };
    }
    
    return {
      title: "Five-Star Date Night Guru 🍷",
      description: "You believe in class and romance. Sourdough pizza, elegant red wine, intimate conversation, and beautiful, candlelit vibes.",
      tagline: "Romantic & Classical",
      emoji: "🍷",
      color: "from-red-500 via-purple-600 to-pink-600"
    };
  };

  // Handles saving answers and transitioning questions
  const handleAnswerQuestion = (categoryVal) => {
    // Play quick tick
    playAudioBeep(440, 0.05, 'sine');
    
    const updatedAnswers = { ...dateQuizAnswers, [dateQuizQuestionIndex]: categoryVal };
    setDateQuizAnswers(updatedAnswers);

    if (dateQuizQuestionIndex < dateQuestions.length - 1) {
      setDateQuizQuestionIndex(prev => prev + 1);
    } else {
      // 5 Questions completed! Let's process matchmaking
      setDateFlowStep('scanning');
      setIsScanningDates(true);
      
      // Play sound clicking ticks
      let ticks = 0;
      const scanInterval = setInterval(() => {
        playAudioBeep(500 + Math.random() * 250, 0.04, 'triangle');
        ticks++;
        if (ticks > 15) {
          clearInterval(scanInterval);
        }
      }, 100);
      
      setTimeout(() => {
        // Filter profiles based on gender preferences
        const filteredProfiles = simulatedProfiles.filter(profile => {
          if (matchmakerPreference === 'M4F') {
            return profile.gender === 'female';
          } else if (matchmakerPreference === 'F4M') {
            return profile.gender === 'male';
          } else if (matchmakerPreference === 'M4M' || matchmakerPreference === 'M4M_Buddies') {
            return profile.gender === 'male';
          } else if (matchmakerPreference === 'F4F' || matchmakerPreference === 'F4F_Buddies') {
            return profile.gender === 'female';
          } else {
            // Group / Platonic Hangout (Both)
            return true;
          }
        });

        const targetCuisine = getRestaurantCuisine(dateRestaurant);
        const targetNeighborhood = dateRestaurant ? dateRestaurant.neighborhood : 'All';

        // Compute compatibility for all filtered profiles
        const results = filteredProfiles.map(profile => {
          let score = 0;
          // Answers object has indices 0-4 mapping to the selected val
          const chosenVals = Object.values(updatedAnswers);
          profile.categories.forEach(cat => {
            if (chosenVals.includes(cat)) {
              score += 1;
            }
          });
          
          // 1. Cuisine Match Bonus (+3 matches value / ~30% compatibility)
          const hasCuisineMatch = profile.categories.includes(targetCuisine);
          if (hasCuisineMatch) {
            score += 3;
          }

          // 2. Neighborhood Proximity Bonus (+2 matches value / ~20% compatibility)
          const hasNeighborhoodMatch = profile.neighborhood.toLowerCase() === targetNeighborhood.toLowerCase();
          if (hasNeighborhoodMatch) {
            score += 2;
          }
          
          // Generate realistic unique percentage
          let percent = 50 + (score * 7) + Math.floor(Math.random() * 6);
          if (hasCuisineMatch && hasNeighborhoodMatch) {
            percent = Math.min(99, percent + 5);
          }
          percent = Math.max(55, Math.min(99, percent));

          return { ...profile, compatibility: percent };
        });
        
        // Sort descending compatibility and take top 3
        const sortedResults = results.sort((a, b) => b.compatibility - a.compatibility).slice(0, 3);
        
        setDateMatchedCandidates(sortedResults);
        setDateSelectedMatch(sortedResults[0]); // default select the best match candidate
        
        // Calculate and trigger Foodie Archetype Card!
        const archetype = getFoodieArchetype(updatedAnswers);
        setSelectedArchetype(archetype);
        setShowArchetypeModal(true);
        
        setDateFlowStep('matches');
        setIsScanningDates(false);
        
        // Play lock notification double beep
        playLockChime(0);
        setTimeout(() => playLockChime(2), 120);
      }, 2000);
    }
  };

  const handleSelectCalendarDate = (dateStr) => {
    // 1. Intercept with Authentication Gate
    if (!user) {
      setShowAuthModal(true);
      triggerToast("👤 Please create an account or sign in first to book dates!");
      playAudioBeep(370, 0.08, 'sine');
      return;
    }

    // 2. Intercept with Monetization / Stripe Gate
    if (!user.is_premium && user.free_meetings_left === 0) {
      setStripeTargetMatch(dateSelectedMatch);
      setStripePaymentAmount(5); // default to $5 one-off pass, they can upgrade to $20 monthly in the sheet
      setShowStripeSuccess(false);
      setShowStripeModal(true);
      playAudioBeep(523.25, 0.05, 'sine');
      triggerToast("👑 Access Locked. Single Date Pass or Premium Subscription required!");
      return;
    }

    // 3. Deduct Free Monthly Pass if available
    if (!user.is_premium && user.free_meetings_left > 0) {
      const updatedProfile = {
        ...user,
        free_meetings_left: user.free_meetings_left - 1
      };
      setUser(updatedProfile);
      triggerToast("✨ Unlocked! You've used your 1 monthly free date invite!");
      
      // Update background Supabase profile if active
      if (!isDbMocked) {
        supabase
          .from('profiles')
          .update({ free_meetings_left: user.free_meetings_left - 1 })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.error("Database update error:", error.message);
          });
      }
    }

    setDatePickedCalendarDate(dateStr);
    
    // Play visual unlock chime chord!
    playAudioBeep(261.63, 0.1, 'sine');
    setTimeout(() => playAudioBeep(329.63, 0.1, 'sine'), 80);
    setTimeout(() => playAudioBeep(392.00, 0.15, 'sine'), 160);
    
    // Set step to revealed
    setDateFlowStep('revealed');
    
    // Prefill date invite ticket draft text
    const draft = `I just sponsored our date! Claim your ticket here: https://munchidate.com`;
    setDateInviteText(draft);
  };

  const parsePickedDate = (dateStr) => {
    try {
      if (!dateStr) return { start: "20260526T190000", end: "20260526T210000" };
      const parts = dateStr.split(',');
      if (parts.length < 2) return { start: "20260526T190000", end: "20260526T210000" };
      const monthDay = parts[1].strip ? parts[1].strip() : parts[1].trim();
      const year = (parts[2] || '2026').trim();
      
      const [monthName, dayStr] = monthDay.split(' ');
      const day = parseInt(dayStr, 10);
      const months = {
        'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
        'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
      };
      const monthIdx = months[monthName] !== undefined ? months[monthName] : 4;
      
      const startDate = new Date(parseInt(year, 10), monthIdx, day, 19, 0, 0);
      const endDate = new Date(parseInt(year, 10), monthIdx, day, 21, 0, 0);
      
      const pad = (num) => String(num).padStart(2, '0');
      const startStr = `${startDate.getFullYear()}${pad(startDate.getMonth() + 1)}${pad(startDate.getDate())}T190000`;
      const endStr = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T210000`;
      
      return { start: startStr, end: endStr };
    } catch (e) {
      return { start: "20260526T190000", end: "20260526T210000" };
    }
  };

  const handleAddGoogleCalendar = () => {
    const { start, end } = parsePickedDate(datePickedCalendarDate);
    const title = encodeURIComponent(`💖 MunchiDate: Sponsored Date at ${dateRestaurant.name} with ${dateSelectedMatch.name}`);
    const details = encodeURIComponent(`🎟️ SPONSORED DATE PASS 🎟️\n\nHost: You (👤 Foodie Host)\nGuest: ${dateSelectedMatch.name} (${dateSelectedMatch.neighborhood})\nVenue: ${dateRestaurant.name} 📍\nSpecial: ${dateRestaurant.specials}\n\nShow your Sponsored Pass to your server to validate the deal! details: https://atlantaspecials.vercel.app`);
    const loc = encodeURIComponent(dateRestaurant.address || 'Atlanta, GA');
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${loc}`;
    window.open(url, '_blank');
  };

  const handleAddAppleCalendar = () => {
    const { start, end } = parsePickedDate(datePickedCalendarDate);
    const title = `MunchiDate: Sponsored Date at ${dateRestaurant.name} with ${dateSelectedMatch.name}`;
    const details = `SPONSORED DATE PASS\\n\\nHost: You (Foodie Host)\\nGuest: ${dateSelectedMatch.name} (${dateSelectedMatch.neighborhood})\\nVenue: ${dateRestaurant.name}\\nSpecial: ${dateRestaurant.specials}`;
    const loc = dateRestaurant.address || 'Atlanta, GA';
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MunchiDate//NONSGML Event//EN",
      "BEGIN:VEVENT",
      `UID:${Date.now()}@munchidate.com`,
      `DTSTAMP:${start}Z`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      `LOCATION:${loc}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `munchidate_${dateRestaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStartSimulatedChat = () => {
    setDateFlowStep('chat');
    setIsTypingChat(true);
    
    const initialMessage = datePassAddedToCalendar
      ? `Hey ${dateSelectedMatch.name}! I matched with you on munchidate.com! I just sponsored a date for us at ${dateRestaurant.name} for this ${dateRestaurant.day} (${datePickedCalendarDate}) and synced it to our calendars! 🎟️📅`
      : `Hey ${dateSelectedMatch.name}! I matched with you on munchidate.com! I just sponsored a date for us at ${dateRestaurant.name} for this ${dateRestaurant.day} (${datePickedCalendarDate}). Join me? 🎟️`;

    setChatMessages([
      { sender: 'you', text: initialMessage }
    ]);
    
    // Play double audio alert
    setTimeout(() => playAudioBeep(659.25, 0.08, 'sine'), 600);
    setTimeout(() => playAudioBeep(783.99, 0.12, 'sine'), 700);

    setTimeout(() => {
      setIsTypingChat(false);
      
      const responseText = datePassAddedToCalendar
        ? `OMG! I just got the Calendar invite on my phone for our date at ${dateRestaurant.name}! That is literally so organized and sweet. 📅💖 I've accepted it and blocked off ${datePickedCalendarDate}! I'm so excited to try their special: "${dateRestaurant.specials.split(' (')[0]}". Let's do it!`
        : `OMG! You fully sponsored our date at ${dateRestaurant.name}?! That's literally so sweet and unique! 💖 I've been dying to try their special: "${dateRestaurant.specials.split(' (')[0]}". ${datePickedCalendarDate} works perfectly for me. Let's do it!`;

      setChatMessages(prev => [
        ...prev,
        { 
          sender: 'match', 
          text: responseText
        }
      ]);
      // Play message received chime
      playAudioBeep(523.25, 0.1, 'triangle');
      setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
    }, 2500);
  };

  // Check daily limit from localStorage on mount
  useEffect(() => {
    const lastSpin = localStorage.getItem('atl_last_spin_date');
    const todayStr = new Date().toDateString();
    if (lastSpin === todayStr) {
      setDailyLimitReached(true);
    }
  }, []);

  // Splash Screen & Install Prompts Lifecycle
  useEffect(() => {
    // 4-second splash screen play timer
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
      setShowInstallPrompt(true);
    }, 4000);

    // 5-minute desktop icon prompt timer
    const desktopTimer = setTimeout(() => {
      setShowDesktopPrompt(true);
    }, 300000);

    return () => {
      clearTimeout(splashTimer);
      clearTimeout(desktopTimer);
    };
  }, []);

  // Web Audio Synth Arcade Sound Generator
  const playAudioBeep = (freq, duration, type = 'sine') => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.log("Audio play blocked or unsupported:", e);
    }
  };

  const playSpinTick = () => playAudioBeep(650, 0.05, 'triangle');
  
  const playLockChime = (index) => {
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord notes
    playAudioBeep(freqs[index] || 520, 0.18, 'sine');
  };

  const playJackpotFanfare = () => {
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]; // Ascending Major scale
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playAudioBeep(freq, 0.22, 'sine');
      }, idx * 90);
    });
  };

  // Casino Slot machine pull handler
  const handleLeverPull = () => {
    if (slotSpinning) return;
    
    // Check local storage daily limit
    if (dailyLimitReached && !slotDemoMode) {
      setSlotStatusText('❌ LIMIT REACHED! ❌');
      setSlotTickerText('⚠️ Daily spin used! Enable Demo Mode to spin again.');
      playAudioBeep(140, 0.35, 'sawtooth');
      return;
    }

    setSlotSpinning(true);
    setSlotLeverPulled(true);
    setSlotWinnerDeal(null);
    setSlotStatusText('🎰 SPINNING... 🎰');
    
    // Mechanical lever click sound
    playAudioBeep(180, 0.15, 'sawtooth');
    setTimeout(() => playAudioBeep(290, 0.15, 'sawtooth'), 80);

    // Grab today's specials
    const activeDeals = specialsData.filter(deal => deal.day === selectedDay);
    
    // Proximity sorting
    let sortedDeals = [...activeDeals];
    if (userLocation) {
      sortedDeals.sort((a, b) => {
        const distA = parseFloat(calculateDistance(userLocation.lat, userLocation.lng, a.lat, a.lng)) || 999;
        const distB = parseFloat(calculateDistance(userLocation.lat, userLocation.lng, b.lat, b.lng)) || 999;
        return distA - distB;
      });
    }

    // Pick one of the closest high value specials
    let selectedWinner = sortedDeals[0] || specialsData[0];
    if (sortedDeals.length > 2) {
      const randIndex = Math.floor(Math.random() * Math.min(3, sortedDeals.length));
      selectedWinner = sortedDeals[randIndex];
    }

    // Identify target emoji matching winning category
    let targetEmoji = '🍕';
    const matchStr = (selectedWinner.specials + ' ' + selectedWinner.name).toLowerCase();
    
    if (matchStr.includes('taco') || matchStr.includes('fiesta') || matchStr.includes('mexican') || matchStr.includes('margarita')) {
      targetEmoji = '🌮';
    } else if (matchStr.includes('burger') || matchStr.includes('slider') || matchStr.includes('american') || matchStr.includes('wings') || matchStr.includes('sandwich')) {
      targetEmoji = '🍔';
    } else if (matchStr.includes('pizza') || matchStr.includes('pasta') || matchStr.includes('italian')) {
      targetEmoji = '🍕';
    } else if (matchStr.includes('sushi') || matchStr.includes('asian') || matchStr.includes('seafood') || matchStr.includes('oyster') || matchStr.includes('crab') || matchStr.includes('fish')) {
      targetEmoji = '🍣';
    } else if (matchStr.includes('sangria') || matchStr.includes('mimosa') || matchStr.includes('cocktail') || matchStr.includes('mule') || matchStr.includes('martini') || matchStr.includes('drink') || matchStr.includes('liquor')) {
      targetEmoji = '🍹';
    } else if (matchStr.includes('beer') || matchStr.includes('lager') || matchStr.includes('happy hour') || matchStr.includes('brew')) {
      targetEmoji = '🍺';
    }

    // Scan ticker animation steps
    const scanTickerSteps = [
      '🛰️ ESTABLISHING HIGH-ACCURACY GPS CONNECTION...',
      '📡 PARSING EATER ATLANTA ONLINE DATA...',
      '🔍 CHECKING OFFLINE NEIGHBORHOOD VENUES...',
      '📊 COMPUTING COORD PROXIMITY HUD METRICS...',
      '⚡ JACKPOTS MATCHING COMPLETE!'
    ];

    scanTickerSteps.forEach((msg, index) => {
      setTimeout(() => {
        setSlotTickerText(msg);
        playSpinTick();
      }, index * 400);
    });

    // Reels spin visual cycle interval
    let ticks = 0;
    const spinTimer = setInterval(() => {
      setReel1(slotEmojis[Math.floor(Math.random() * slotEmojis.length)]);
      setReel2(slotEmojis[Math.floor(Math.random() * slotEmojis.length)]);
      setReel3(slotEmojis[Math.floor(Math.random() * slotEmojis.length)]);
      playSpinTick();
      ticks++;
      if (ticks > 15) {
        clearInterval(spinTimer);
      }
    }, 100);

    // Sequential Locks
    setTimeout(() => {
      setReel1(targetEmoji);
      playLockChime(0);
    }, 1500);

    setTimeout(() => {
      setReel2(targetEmoji);
      playLockChime(1);
    }, 1900);

    setTimeout(() => {
      setReel3(targetEmoji);
      playLockChime(2);

      // Spin complete, jackpot matched!
      setSlotWinnerDeal(selectedWinner);
      setSlotStatusText('🎰 JACKPOT MATCH! 🎰');
      setSlotTickerText('🎉 CONGRATS! WE FOUND TODAY\'S BEST DEALS NEAR YOU! 🎉');
      playJackpotFanfare();

      // Record in local storage if not demo
      if (!slotDemoMode) {
        const todayStr = new Date().toDateString();
        localStorage.setItem('atl_last_spin_date', todayStr);
        setDailyLimitReached(true);
      }

      setSlotSpinning(false);
      setSlotLeverPulled(false);
    }, 2300);
  };

  
  // Video and Sound control for Explore Feed
  const [isMuted, setIsMuted] = useState(true);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRefs = useRef([]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const neighborhoods = ['All', 'Midtown', 'Buckhead', 'West Midtown', 'Inman Park/O4W', 'Decatur', 'Downtown', 'City of South Fulton', 'Sandy Springs', 'Dunwoody', 'Alpharetta', 'Roswell', 'Others'];

  // Load favorites from local storage
  useEffect(() => {
    const savedFavs = localStorage.getItem('atl_favorites');
    const savedDeals = localStorage.getItem('atl_saved_deals');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    if (savedDeals) setSavedSpecials(JSON.parse(savedDeals));
  }, []);

  // Update video autoplay on index change or tab change
  useEffect(() => {
    if (activeTab === 'explore' && exploreMode === 'reels') {
      videoRefs.current.forEach((video, idx) => {
        if (video) {
          if (idx === currentVideoIndex) {
            video.play().catch(err => console.log("Autoplay blocked: ", err));
          } else {
            video.pause();
            video.currentTime = 0;
          }
        }
      });
    } else {
      videoRefs.current.forEach(video => {
        if (video) video.pause();
      });
    }
  }, [activeTab, exploreMode, currentVideoIndex]);

  // ================= REELS GESTURE SWIPING HANDLERS =================
  const handleReelsDragStart = (e) => {
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setReelsDragStartY(clientY);
    setReelsDragOffsetY(0);
    setIsReelsDragging(true);
  };

  const handleReelsDragMove = (e) => {
    if (!isReelsDragging) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = clientY - reelsDragStartY;
    setReelsDragOffsetY(deltaY);
  };

  const handleReelsDragEnd = () => {
    if (!isReelsDragging) return;
    setIsReelsDragging(false);
    
    if (reelsDragOffsetY < -50) {
      handleNextVideo();
    } else if (reelsDragOffsetY > 50) {
      handlePrevVideo();
    }
    setReelsDragOffsetY(0);
  };

  // ================= SWIPABLE GESTURE CARD HANDLERS =================
  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (e, exploreCardsList) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    setSwipeOffsetX(deltaX);
    setSwipeOffsetY(deltaY);

    if (deltaX > 60) {
      setSwipeDirection('right');
    } else if (deltaX < -60) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleDragEnd = (exploreCardsList) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (swipeOffsetX > 90) {
      handleSwipeAction('right', exploreCardsList);
    } else if (swipeOffsetX < -90) {
      handleSwipeAction('left', exploreCardsList);
    } else {
      setSwipeOffsetX(0);
      setSwipeOffsetY(0);
      setSwipeDirection(null);
    }
  };

  const handleSwipeAction = (direction, exploreCardsList) => {
    const card = exploreCardsList[currentCardIndex];
    if (!card) return;

    if (direction === 'right') {
      if (!favorites.includes(card.name)) {
        toggleFavorite(card.name);
      }
      if (!savedSpecials.includes(card.name)) {
        toggleSaveSpecial(card.name);
      }
      // Triple chord success chime
      playAudioBeep(523.25, 0.08, 'triangle');
      setTimeout(() => playAudioBeep(659.25, 0.08, 'triangle'), 80);
      setTimeout(() => playAudioBeep(783.99, 0.12, 'triangle'), 160);
      triggerToast(`🍽️ Wishlisted: "${card.name}"! 💖`);
    } else {
      // Swish skip sound
      playAudioBeep(180, 0.12, 'sine');
      triggerToast(`🙅‍♂️ Passed on "${card.name}"`);
    }

    setSwipeOffsetX(0);
    setSwipeOffsetY(0);
    setSwipeDirection(null);

    if (currentCardIndex < exploreCardsList.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setCurrentCardIndex(0);
      triggerToast("🔄 Refreshed the restaurant deck! Swipe again!");
    }
  };

  const toggleFavorite = (name) => {
    let updated;
    if (favorites.includes(name)) {
      updated = favorites.filter(fav => fav !== name);
    } else {
      updated = [...favorites, name];
    }
    setFavorites(updated);
    localStorage.setItem('atl_favorites', JSON.stringify(updated));
  };

  const toggleSaveSpecial = (name) => {
    let updated;
    if (savedSpecials.includes(name)) {
      updated = savedSpecials.filter(s => s !== name);
    } else {
      updated = [...savedSpecials, name];
    }
    setSavedSpecials(updated);
    localStorage.setItem('atl_saved_deals', JSON.stringify(updated));
  };

  // Dynamic Google Maps JS API loader
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.google && window.google.maps) {
        setGoogleMapsLoaded(true);
        return;
      }
      
      const scriptId = 'google-maps-sdk-script';
      let script = document.getElementById(scriptId);
      
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&callback=initGoogleMapsCallback';
        script.async = true;
        script.defer = true;
        
        window.initGoogleMapsCallback = () => {
          setGoogleMapsLoaded(true);
          delete window.initGoogleMapsCallback;
        };
        
        script.onerror = () => {
          console.error("Failed to load Google Maps SDK.");
        };
        
        document.head.appendChild(script);
      } else {
        const interval = setInterval(() => {
          if (window.google && window.google.maps) {
            setGoogleMapsLoaded(true);
            clearInterval(interval);
          }
        }, 100);
      }
    }
  }, []);

  // Initialize or update Street View Panorama
  useEffect(() => {
    if (!googleMapsLoaded || activeTab !== 'map' || !streetViewRef.current) return;

    // Use selected restaurant coordinates or default to Midtown Atlanta
    const coords = mapSelectedRestaurant 
      ? { lat: mapSelectedRestaurant.lat, lng: mapSelectedRestaurant.lng }
      : { lat: 33.7749, lng: -84.3819 };

    setStreetViewStatus('loading');

    try {
      const svService = new window.google.maps.StreetViewService();
      svService.getPanorama(
        {
          location: coords,
          radius: 100, // Search within 100 meters
          source: window.google.maps.StreetViewSource.OUTDOOR // Prefer outdoor panoramas
        },
        (data, status) => {
          if (status === window.google.maps.StreetViewStatus.OK && data) {
            setStreetViewStatus('ok');
            
            const panoOptions = {
              position: coords,
              pov: {
                heading: 165, // Horizontal heading
                pitch: 0      // Vertical pitch
              },
              zoom: 1,
              zoomControl: true,
              addressControl: true, // Address visibility
              motionTracking: true, // Gyroscope/motion tracking
              motionTrackingControl: true,
              fullscreenControl: false,
              panControl: true,
              linksControl: true,
              enableCloseButton: false,
              visible: true
            };

            // Initialize or update the panorama object
            if (!panoramaRef.current) {
              panoramaRef.current = new window.google.maps.StreetViewPanorama(
                streetViewRef.current,
                panoOptions
              );
            } else {
              panoramaRef.current.setOptions(panoOptions);
            }
          } else {
            console.warn("No Street View imagery found at coordinates:", coords);
            setStreetViewStatus('no_imagery');
            if (panoramaRef.current) {
              panoramaRef.current.setVisible(false);
            }
          }
        }
      );
    } catch (err) {
      console.error("Error initializing Street View Panorama:", err);
      setStreetViewStatus('no_imagery');
    }
  }, [googleMapsLoaded, activeTab, mapSelectedRestaurant]);

  // Reset mapHasBeenReset state when tab, day, or neighborhood changes to enable auto-selection
  useEffect(() => {
    setMapHasBeenReset(false);
  }, [selectedDay, selectedNeighborhood, activeTab]);

  // Auto-select the first active restaurant when entering the map or changing days/filters
  useEffect(() => {
    if (activeTab === 'map' && !mapHasBeenReset) {
      const activeDeals = specialsData.filter(deal => 
        deal.day === selectedDay && 
        (selectedNeighborhood === 'All' || deal.neighborhood === selectedNeighborhood)
      );
      if (activeDeals.length > 0) {
        // If we don't have a mapSelectedRestaurant or it belongs to a different day, auto-select the first active spot
        if (!mapSelectedRestaurant || mapSelectedRestaurant.day !== selectedDay) {
          setMapSelectedRestaurant(activeDeals[0]);
        }
      } else {
        setMapSelectedRestaurant(null);
      }
    }
  }, [selectedDay, selectedNeighborhood, activeTab, mapSelectedRestaurant, mapHasBeenReset]);

  // Filter deals based on Day, Search query, and Neighborhood
  const filteredDeals = specialsData.filter(deal => {
    const matchesDay = deal.day === selectedDay;
    const matchesNeighborhood = selectedNeighborhood === 'All' || deal.neighborhood === selectedNeighborhood;
    const matchesSearch = searchQuery === '' || 
      deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.specials.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.neighborhood.toLowerCase().includes(searchQuery.toLowerCase());
      
    return matchesDay && matchesNeighborhood && matchesSearch;
  });

  // Extract all deals with videos for the Explore feed
  const exploreVideos = specialsData.filter(deal => deal.video && (selectedNeighborhood === 'All' || deal.neighborhood === selectedNeighborhood));

  // Extract all deals for the Swipable Explore feed
  const exploreCards = specialsData.filter(deal => selectedNeighborhood === 'All' || deal.neighborhood === selectedNeighborhood);

  const handleNextVideo = () => {
    if (currentVideoIndex < exploreVideos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    } else {
      setCurrentVideoIndex(0); // Loop back
    }
  };

  const handlePrevVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
    } else {
      setCurrentVideoIndex(exploreVideos.length - 1);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center p-4 md:p-8 gap-8">
      
      {/* ================= LEFT SIDE: DOCUMENTATION & DESCRIPTION ================= */}
      <div className="flex-1 max-w-xl text-center md:text-left space-y-6 animate-fade-in">
        <div className="flex flex-col items-center md:items-start gap-4">
          <img src="/munchidate_logo.png?v=10" alt="Munchi Date Logo" className="h-14 md:h-16 object-contain filter drop-shadow-xl" />
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-full text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5" /> Antigravity Native Visualizer
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent font-outfit">
          munchidate.com Live App Preview
        </h1>
        <p className="text-slate-400 leading-relaxed text-sm md:text-base">
          Welcome to the fully functional visual emulator for the **munchidate.com App**. 
          Interact directly with the cell phone screen on the right. Switch days of the week, test the live search, favorite restaurants, swipe through video reels, and explore geolocated pinpoints in real time.
        </p>

        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
            <h2 className="text-indigo-400 font-semibold font-outfit text-sm">🗓️ 7-Day Interactive Database</h2>
            <p className="text-xs text-slate-500 mt-1">70 detailed Atlanta venue deals loaded directly inside the local database.</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
            <h2 className="text-emerald-400 font-semibold font-outfit text-sm">📹 Swipeable Foodie Reels</h2>
            <p className="text-xs text-slate-500 mt-1">TikTok-style vertical scrolling video reels with live interactive action buttons.</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
            <h2 className="text-amber-400 font-semibold font-outfit text-sm">📍 Day-Active Map Pins</h2>
            <p className="text-xs text-slate-500 mt-1">Simulated geolocation system showing pin drops of restaurants active today.</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-2xl">
            <h2 className="text-pink-400 font-semibold font-outfit text-sm">⚡ Real-Time Fast Refresh</h2>
            <p className="text-xs text-slate-500 mt-1">As you modify files in your workspace, the visual emulator updates instantly.</p>
          </div>
        </div>

        {/* ================= PREMIUM GLASSMORPHIC FAQ & FRESHNESS PANEL ================= */}
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-6 text-left mt-6">
          <div className="flex items-center justify-between border-b border-slate-750 pb-4">
            <div>
              <span className="text-[10px] font-black text-indigo-400 tracking-widest font-outfit uppercase">Generative Search Ready</span>
              <h2 className="text-xl font-extrabold text-white font-outfit mt-1">Frequently Asked Questions</h2>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Live & Verified Daily
              </span>
              <span className="text-[9px] text-slate-500 mt-1 font-medium font-outfit">Last Sync: May 28, 2026</span>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "How does MunchiDate help you find Atlanta happy hours and food specials?",
                a: "MunchiDate is Atlanta’s premium interactive map directory tracking over 70+ restaurant specials, happy hours, and dining deals. Users can filter deals by day of the week, search by favorite food categories, and geolocate active spots in real-time."
              },
              {
                q: "What are the best food specials and dining deals for date planning in Atlanta?",
                a: "Whether you are planning a casual taco night at Loca Luna in Midtown, oyster happy hours at Alici in Buckhead, or a romantic pasta dinner at Forza Storico in West Midtown, MunchiDate compiles live, human-verified specials tailored specifically to your foodie taste preferences."
              },
              {
                q: "How does the MunchiDate AI Matchmaker connect local single foodies?",
                a: "Our proprietary AI Date Matchmaker matches you with compatible local singles based on your flavor profile, favorite cuisines, hosting preferences, and neighborhood convenience. Simply take our 5-question Matchmaker Quiz to unlock verified matches and plan the perfect dining date."
              },
              {
                q: "Are the happy hour deals and food specials verified?",
                a: "Yes, absolutely. Our dining deal database is synchronized and verified daily by our team. We coordinate directly with Atlanta food establishments and social media feeds to ensure 100% accurate pricing, hours, and active specials."
              }
            ].map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx}
                  className="bg-slate-900/40 hover:bg-slate-900/60 border border-slate-850 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => {
                      setActiveFaq(isOpen ? null : idx);
                    }}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-outfit text-xs font-black text-slate-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className={`text-indigo-400 font-bold transition-transform duration-300 transform ${isOpen ? 'rotate-90' : ''}`}>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? 'max-h-40 border-t border-slate-850/50' : 'max-h-0'
                    }`}
                  >
                    <p className="px-5 py-4 text-[11px] text-slate-400 leading-relaxed font-medium">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE: HIGH-FIDELITY PHONE EMULATOR ================= */}
      <div className="relative w-[390px] h-[800px] shrink-0 bg-slate-950 rounded-[55px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border-4 border-slate-800/80 ring-12 ring-slate-900/50 flex flex-col justify-between overflow-hidden animate-slide-up">
        
        {/* iPhone Speaker / Dynamic Island */}
        <div 
          onClick={() => {
            setShowDesktopPrompt(true);
            playAudioBeep(523.25, 0.1, 'sine');
            triggerToast("💻 Developer shortcut: Desktop Shortcut Prompt triggered!");
          }}
          className="absolute top-4 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-3xl z-50 flex items-center justify-between px-4 cursor-pointer hover:scale-105 active:scale-95 transition-all"
          title="Click to trigger Desktop Shortcut Prompt (Developer Shortcut)"
        >
          <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-indigo-500/20"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-900/50"></div>
        </div>

        {/* ================= EMULATOR SCREEN WRAPPER ================= */}
        <div className="w-full h-full bg-slate-900 rounded-[44px] overflow-hidden relative flex flex-col justify-between z-10 select-none">
          
          {/* 1. Foodie Archetype Card Modal Overlay */}
          {showArchetypeModal && selectedArchetype && (
            <div className="absolute inset-0 z-[950] bg-slate-950/90 backdrop-blur-md flex items-center justify-center px-4 rounded-[44px] overflow-hidden animate-fade-in">
              <div className="w-full max-w-[280px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/60 p-5 rounded-[28px] shadow-2xl flex flex-col items-center text-center relative border-indigo-500/25">
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowArchetypeModal(false);
                    playAudioBeep(440, 0.05, 'sine');
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs p-1 rounded-full hover:bg-white/10 z-[952]"
                  aria-label="Close"
                >
                  ✕
                </button>

                <ArchetypeCanvas 
                  archetype={selectedArchetype} 
                  onClose={() => {
                    setShowArchetypeModal(false);
                    playAudioBeep(440, 0.05, 'sine');
                  }} 
                />
              </div>
            </div>
          )}

          {/* 2. Shareable Concert-Style Date Pass Modal Overlay */}
          {showDatePassModal && dateSelectedMatch && dateRestaurant && (
            <div className="absolute inset-0 z-[950] bg-slate-950/90 backdrop-blur-md flex items-center justify-center px-4 rounded-[44px] overflow-hidden animate-fade-in">
              <div className="w-full max-w-[280px] bg-slate-900 border border-slate-700/60 p-4 rounded-[28px] shadow-2xl flex flex-col items-center relative border-indigo-500/20">
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowDatePassModal(false);
                    playAudioBeep(440, 0.05, 'sine');
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs p-1 rounded-full hover:bg-white/10 z-[952]"
                  aria-label="Close"
                >
                  ✕
                </button>

                <span className="text-[9px] font-bold text-indigo-400 tracking-wider uppercase font-outfit mb-3">
                  🎟️ Date Pass Ticket stub
                </span>

                {/* Retro Ticket Body */}
                <div className="w-full bg-slate-950 border border-dashed border-slate-700/60 rounded-xl p-3.5 flex flex-col items-center relative overflow-hidden mb-3.5 select-none">
                  {/* Left Notch */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 border border-slate-700/60 rounded-full z-10"></div>
                  {/* Right Notch */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 border border-slate-700/60 rounded-full z-10"></div>
                  
                  {/* Header */}
                  <div className="text-[8.5px] font-black tracking-widest text-indigo-400 uppercase border-b border-indigo-500/20 w-full pb-1 text-center font-outfit">
                    MUNCHIDATE PASSPORT
                  </div>

                  {/* Restaurant Name */}
                  <div className="text-xs font-black text-white font-outfit tracking-wide mt-2 text-center">
                    {dateRestaurant.name.toUpperCase()}
                  </div>

                  {/* Deal details */}
                  <div className="text-[8px] text-pink-400 font-bold tracking-tight bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/10 mt-1.5 text-center">
                    {dateRestaurant.specials}
                  </div>

                  <div className="w-full border-t border-dashed border-slate-800 my-2.5"></div>

                  {/* Info */}
                  <div className="flex justify-between w-full text-left gap-1 px-1">
                    <div>
                      <div className="text-[6.5px] text-slate-500 font-bold uppercase">HOSTED BY</div>
                      <div className="text-[8.5px] text-white font-black">YOU</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[6.5px] text-slate-500 font-bold uppercase">DATE GUEST</div>
                      <div className="text-[8.5px] text-white font-black">{dateSelectedMatch.name}</div>
                    </div>
                  </div>

                  <div className="flex justify-between w-full text-left gap-1 px-1 mt-2">
                    <div>
                      <div className="text-[6.5px] text-slate-500 font-bold uppercase">DATE TIME</div>
                      <div className="text-[8.5px] text-white font-black">{datePickedCalendarDate || 'Mon, May 26'} @ 7:00 PM</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[6.5px] text-slate-500 font-bold uppercase">PASS CODE</div>
                      <div className="text-[8.5px] text-indigo-450 font-extrabold font-mono text-indigo-450">MD-{Math.floor(1000 + Math.random() * 9000)}</div>
                    </div>
                  </div>

                  <div className="w-full border-t border-dashed border-slate-800 my-2.5"></div>

                  {/* Barcode */}
                  <div className="flex flex-col items-center mt-0.5 w-full gap-0.5">
                    <div className="h-5 bg-slate-200 w-11/12 flex items-center justify-around overflow-hidden p-0.5 rounded-[1px] opacity-75">
                      {[...Array(24)].map((_, i) => (
                        <div 
                          key={i} 
                          className="bg-black h-full" 
                          style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[6px] text-slate-500 font-mono tracking-[2px] uppercase">
                      * UNLOCKED PASSPORT DATE *
                    </span>
                  </div>
                </div>

                {/* Share Button */}
                <button 
                  onClick={() => {
                    playAudioBeep(523.25, 0.1, 'triangle');
                    setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
                    triggerToast("📥 Date Pass Ticket exported successfully to your camera roll! 📸");
                  }}
                  className="w-full py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold rounded-xl text-[10px] shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-indigo-500/10"
                >
                  📥 Export Ticket stub to Gallery
                </button>

                <button 
                  onClick={() => {
                    setShowDatePassModal(false);
                    playAudioBeep(440, 0.05, 'sine');
                  }}
                  className="mt-2 text-[9px] text-slate-500 hover:text-slate-350 font-semibold tracking-wide cursor-pointer transition-colors"
                >
                  Back to Chat
                </button>
              </div>
            </div>
          )}

          {/* 3. Cocktail Referral Reward Voucher Modal Overlay */}
          {showReferralVoucher && (
            <div className="absolute inset-0 z-[950] bg-slate-950/90 backdrop-blur-md flex items-center justify-center px-4 rounded-[44px] overflow-hidden animate-fade-in">
              <div className="w-full max-w-[280px] bg-slate-900 border border-slate-700/60 p-5 rounded-[28px] shadow-2xl flex flex-col items-center relative text-center border-indigo-500/20">
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowReferralVoucher(false);
                    playAudioBeep(440, 0.05, 'sine');
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs p-1 rounded-full hover:bg-white/10"
                  aria-label="Close"
                >
                  ✕
                </button>

                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-yellow-400 via-orange-400 to-pink-500 p-0.5 shadow-lg shadow-orange-500/20 mb-3 flex items-center justify-center animate-pulse">
                  <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center overflow-hidden">
                    <span className="text-2xl">🍹</span>
                  </div>
                </div>

                <span className="text-[8px] font-bold text-yellow-400 tracking-wider uppercase font-outfit px-2 py-0.5 bg-yellow-500/10 rounded-full border border-yellow-500/15 mb-1.5">
                  REWARD UNLOCKED
                </span>

                <h3 className="text-sm font-extrabold text-white font-outfit tracking-wide leading-tight">
                  2x Free Cocktails Pass 🍹
                </h3>

                <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed font-medium mb-3.5 px-1">
                  Referral code entered successfully! Present this pass at any MunchiDate sponsored venue for 2 free craft drinks on us!
                </p>

                <div className="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-2xl flex flex-col items-center justify-center mb-3.5">
                  <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider">VOUCHER SECURE CODE</span>
                  <span className="text-[10px] font-black text-indigo-400 font-mono tracking-widest mt-0.5 uppercase">MUNCHI-DRINKS-{Math.floor(1000 + Math.random() * 9000)}</span>
                </div>

                <button 
                  onClick={() => {
                    playAudioBeep(523.25, 0.1, 'triangle');
                    setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
                    triggerToast("📥 Cocktail voucher saved to Munchi Wallet! 🍹");
                    setShowReferralVoucher(false);
                  }}
                  className="w-full py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-950 font-bold rounded-xl text-[10px] shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-orange-500/15"
                >
                  🎁 Save to Munchi Wallet
                </button>
              </div>
            </div>
          )}

          {/* ================= SUPABASE AUTHENTICATION MODAL ================= */}
          {showAuthModal && (
            <div className="absolute inset-0 z-[960] bg-slate-950/90 backdrop-blur-md flex items-center justify-center px-4 rounded-[44px] overflow-hidden animate-fade-in animate-slide-up">
              <div className="w-full max-w-[280px] bg-slate-900 border border-slate-700/60 p-5 rounded-[28px] shadow-2xl flex flex-col items-center relative border-indigo-500/20">
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowAuthModal(false);
                    playAudioBeep(440, 0.05, 'sine');
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs p-1 rounded-full hover:bg-white/10 z-[962]"
                >
                  ✕
                </button>
                
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xl mb-3 shadow-md">
                  👤
                </div>

                <h3 className="text-xs font-black text-white font-outfit tracking-wide text-center">
                  {user ? "Your Foodie Profile" : (isSignUpMode ? "Create Munchi Account" : "Sign In to Munchi")}
                </h3>
                <p className="text-[9px] text-slate-400 text-center mt-1 leading-normal max-w-xs px-1 font-medium font-outfit">
                  {user 
                    ? "Manage your active subscription, date passes, and saved culinary spots."
                    : (isSignUpMode 
                        ? "Save specials, track matching compatibility, and treat matches!" 
                        : "Welcome back! Connect with foodies and unlock dinner passes.")}
                </p>

                {user ? (
                  // Logged-in profile details HUD
                  <div className="w-full mt-3.5 space-y-3 text-center animate-slide-up">
                    <div className="w-full bg-slate-950 border border-slate-850/80 p-3 rounded-2xl flex flex-col items-center justify-center relative">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-850 overflow-hidden mb-1.5 shadow-sm animate-glow-ring select-none">
                        <img src={user.avatar_url} alt="User Profile" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[9.5px] font-black text-slate-200 font-outfit">{user.name}</span>
                      <span className="text-[8px] bg-pink-500/10 text-pink-400 border border-pink-500/15 px-2.5 py-0.5 rounded-full mt-1.5 font-black uppercase tracking-wider leading-none">
                        {user.is_premium ? "👑 Premium Member" : "🎟️ Free Tier"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-left font-mono text-[8px] text-slate-450 leading-snug px-1 border-t border-slate-850 pt-2 w-full">
                      <div className="flex justify-between">
                        <span className="text-slate-550 uppercase">Free Date Invites:</span>
                        <span className="text-slate-200 font-bold">{user.free_meetings_left} Left</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-550 uppercase">Saved Restaurants:</span>
                        <span className="text-slate-200 font-bold">{user.saved_spots ? user.saved_spots.length : 0} Spots</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        handleSignOut();
                      }}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-[10px] cursor-pointer shadow-md transition-all active:scale-95 shadow-rose-500/10"
                    >
                      👋 Sign Out
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAuthSubmit} className="w-full space-y-2 mt-3 animate-slide-up">
                    {isSignUpMode && (
                      <input 
                        type="text" 
                        placeholder="Your Name" 
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-[9px] text-white focus:outline-none focus:border-indigo-500 font-bold font-outfit"
                      />
                    )}
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-[9px] text-white focus:outline-none focus:border-indigo-500 font-bold font-outfit"
                    />
                    <input 
                      type="password" 
                      placeholder="Password" 
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-855 p-2.5 rounded-xl text-[9px] text-white focus:outline-none focus:border-indigo-500 font-bold font-outfit"
                    />

                    <button 
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-black rounded-xl text-[10px] shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 font-outfit uppercase tracking-wider"
                    >
                      {authLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        isSignUpMode ? "📝 Register Account" : "🔑 Sign In"
                      )}
                    </button>
                  </form>
                )}

                {!user && (
                  <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
                    <button 
                      onClick={() => {
                        setIsSignUpMode(!isSignUpMode);
                        playAudioBeep(330, 0.05, 'sine');
                      }}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer font-outfit"
                    >
                      {isSignUpMode ? "Already have an account? Sign In" : "New to Munchi? Create Account"}
                    </button>

                    <div className="w-full border-t border-slate-850 my-1"></div>

                    <button 
                      onClick={() => {
                        // Fast demo bypass login trigger
                        setAuthLoading(true);
                        playAudioBeep(523.25, 0.08, 'sine');
                        setTimeout(() => {
                          const demoUser = {
                            name: "Alex Carter",
                            avatar_url: "/portraits/profile_1.png",
                            archetype: selectedArchetype ? selectedArchetype.title : "Midnight Street Food Rebel",
                            saved_spots: ["Loca Luna Sangria", "Ecco Midtown Pasta"],
                            free_meetings_left: 1,
                            is_premium: false,
                            premium_since: null
                          };
                          setUser(demoUser);
                          setAuthLoading(false);
                          setShowAuthModal(false);
                          triggerToast("⚡ Logged in instantly as Demo User!");
                          playAudioBeep(523.25, 0.1, 'triangle');
                          setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
                        }, 700);
                      }}
                      className="w-full py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-[9px] cursor-pointer active:scale-95 transition-all font-outfit"
                    >
                      ⚡ Instant Demo Access
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STRIPE PAYMENT MODAL ================= */}
          {showStripeModal && (
            <div className="absolute inset-0 z-[960] bg-slate-950/90 backdrop-blur-md flex items-center justify-center px-4 rounded-[44px] overflow-hidden animate-fade-in animate-slide-up">
              <div className="w-full max-w-[280px] bg-slate-900 border border-slate-700/60 p-5 rounded-[28px] shadow-2xl flex flex-col items-center relative border-indigo-500/20">
                <button 
                  onClick={() => {
                    setShowStripeModal(false);
                    playAudioBeep(440, 0.05, 'sine');
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs p-1 rounded-full hover:bg-white/10 z-[962]"
                >
                  ✕
                </button>

                {showStripeSuccess ? (
                  <div className="w-full text-center space-y-4 py-4 animate-scale-up">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto shadow-lg animate-bounce">
                      🎉
                    </div>
                    <div className="space-y-1.5 leading-none">
                      <h3 className="text-xs font-black text-white font-outfit">Payment Completed!</h3>
                      <p className="text-[9.5px] text-slate-450 leading-relaxed font-medium font-outfit mt-1.5">
                        Thank you! Your dating access has been successfully unlocked. Get ready for your culinary date! 🥂
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowStripeSuccess(false);
                        setShowStripeModal(false);
                        playAudioBeep(523.25, 0.08, 'sine');
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-[10px] cursor-pointer shadow-md transition-all active:scale-95 shadow-emerald-500/10 font-outfit"
                    >
                      🌟 Let's go!
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col text-left">
                    <div className="text-center space-y-1 mb-3 shrink-0 leading-none">
                      <span className="text-[8px] font-black text-rose-500 tracking-widest font-outfit uppercase animate-pulse">👑 Munchi Premium VIP 👑</span>
                      <h3 className="text-[11px] font-black text-white font-outfit leading-tight mt-1.5">Unlock Dating Invite</h3>
                      <p className="text-[9px] text-slate-450 leading-normal max-w-xs mx-auto mt-1 font-medium font-outfit">
                        Treat {stripeTargetMatch?.name || "your match"}! Choose how you would like to unlock this date invite:
                      </p>
                    </div>

                    {/* Pricing selector options */}
                    <div className="space-y-2 shrink-0">
                      {/* Option A: $20 Monthly */}
                      <button
                        onClick={() => {
                          setStripePaymentAmount(20);
                          playAudioBeep(330, 0.05, 'sine');
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl border text-[9px] font-bold font-outfit transition-all duration-300 cursor-pointer flex justify-between items-center ${
                          stripePaymentAmount === 20
                            ? 'bg-rose-500/10 border-rose-500 text-rose-450 shadow-md'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        <div className="space-y-0.5 leading-none">
                          <span className="block font-black text-slate-200">👑 Monthly Premium VIP</span>
                          <span className="block text-[7.5px] text-slate-500 font-medium mt-0.5">Unlimited dating & matching passes</span>
                        </div>
                        <span className="font-extrabold text-[10px] shrink-0">$20 / mo</span>
                      </button>

                      {/* Option B: $5 One-off */}
                      <button
                        onClick={() => {
                          setStripePaymentAmount(5);
                          playAudioBeep(330, 0.05, 'sine');
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl border text-[9px] font-bold font-outfit transition-all duration-300 cursor-pointer flex justify-between items-center ${
                          stripePaymentAmount === 5
                            ? 'bg-rose-500/10 border-rose-500 text-rose-450 shadow-md'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                        }`}
                      >
                        <div className="space-y-0.5 leading-none">
                          <span className="block font-black text-slate-200">🎟️ Single Date Ticket</span>
                          <span className="block text-[7.5px] text-slate-500 font-medium mt-0.5">Unlock this specific date meetup only</span>
                        </div>
                        <span className="font-extrabold text-[10px] shrink-0">$5 / date</span>
                      </button>
                    </div>

                    {/* Stripe Card details form */}
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        setStripePaymentLoading(true);
                        playAudioBeep(523.25, 0.08, 'sine');

                        // Luhn Validation or card entry verification mock checkout
                        setTimeout(() => {
                          // Deduct payment and upgrade user account tier
                          setUser(prev => {
                            if (!prev) return null;
                            const updated = { ...prev };
                            if (stripePaymentAmount === 20) {
                              updated.is_premium = true;
                              updated.premium_since = new Date().toISOString();
                            } else {
                              // One off unlock: does not set permanent premium, but allows date scheduler step to pass!
                            }
                            return updated;
                          });

                          setStripePaymentLoading(false);
                          setShowStripeSuccess(true);
                          
                          // Celebrate with triple chimes
                          playAudioBeep(523.25, 0.1, 'sine');
                          setTimeout(() => playAudioBeep(659.25, 0.15, 'sine'), 100);
                          setTimeout(() => playAudioBeep(783.99, 0.2, 'sine'), 200);
                          triggerToast(`💳 Stripe successfully charged $${stripePaymentAmount}.00! Date pass unlocked! 🥂`);

                          // Complete actual scheduling action in dateFlowStep!
                          setDateFlowStep('revealed');
                          const dateStr = datePickedCalendarDate || "Thursday, May 28, 2026";
                          setDatePickedCalendarDate(dateStr);
                          const draft = `🎟️ SPONSORED DATE PASS 🎟️\nHost: You (👤 Foodie Host)\nGuest: ${stripeTargetMatch?.name} (${stripeTargetMatch?.neighborhood})\nVenue: ${dateRestaurant.name} 📍\nDate: ${dateStr}\nStatus: FULLY SPONSORED BY HOST\n\nHey ${stripeTargetMatch?.name}! I saw you on Munchi Date Finder. I just sponsored a date for us for the ${dateRestaurant.day} special! Join me? details: https://atlantaspecials.vercel.app`;
                          setDateInviteText(draft);
                        }, 2000);
                      }} 
                      className="w-full space-y-2 mt-4"
                    >
                      <span className="text-[7.5px] font-black text-slate-550 uppercase tracking-widest block font-mono">💳 Secure Stripe Card Element</span>
                      
                      <input 
                        type="text" 
                        placeholder="Card Number (e.g. 4242 4242 4242 4242)"
                        required
                        maxLength={19}
                        value={stripeCardNum}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                          const matches = v.match(/\d{4,16}/g);
                          const match = matches && matches[0] || '';
                          const parts = [];
                          for (let i=0, len=match.length; i<len; i+=4) {
                            parts.push(match.substring(i, i+4));
                          }
                          if (parts.length > 0) {
                            setStripeCardNum(parts.join(' '));
                          } else {
                            setStripeCardNum(v);
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-[10px] text-white focus:outline-none focus:border-rose-500 font-mono tracking-wider font-bold"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          placeholder="MM/YY" 
                          required
                          maxLength={5}
                          value={stripeCardExpiry}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                            if (v.length >= 2) {
                              setStripeCardExpiry(v.substring(0,2) + '/' + v.substring(2,4));
                            } else {
                              setStripeCardExpiry(v);
                            }
                          }}
                          className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-[10px] text-white focus:outline-none focus:border-rose-500 font-mono text-center font-bold"
                        />
                        <input 
                          type="text" 
                          placeholder="CVC" 
                          required
                          maxLength={3}
                          value={stripeCardCvc}
                          onChange={(e) => setStripeCardCvc(e.target.value.replace(/[^0-9]/gi, ''))}
                          className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-[10px] text-white focus:outline-none focus:border-rose-500 font-mono text-center font-bold"
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="ZIP Code" 
                        required
                        maxLength={5}
                        value={stripeCardZip}
                        onChange={(e) => setStripeCardZip(e.target.value.replace(/[^0-9]/gi, ''))}
                        className="w-full bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-[10px] text-white focus:outline-none focus:border-rose-500 font-mono text-center font-bold"
                      />

                      <button 
                        type="submit"
                        disabled={stripePaymentLoading}
                        className="w-full py-2.5 mt-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black rounded-xl text-[10.5px] shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 font-outfit uppercase tracking-wider"
                      >
                        {stripePaymentLoading ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          `💳 Pay $${stripePaymentAmount}.00 Now`
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* MunchiDate 4s Video Splash Screen Overlay */}
          {showSplash && (
            <div className="absolute inset-0 z-[1000] bg-black flex flex-col items-center justify-center rounded-[44px] overflow-hidden">
              <video 
                src="/munchidate_splash.mp4" 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover"
                onEnded={() => {
                  setShowSplash(false);
                  setShowInstallPrompt(true);
                }}
              />
              <div className="absolute bottom-12 flex flex-col items-center gap-1.5 z-[1001]">
                <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-outfit">Loading MunchiDate...</span>
              </div>
            </div>
          )}

          {/* High-Fidelity Mobile App Installation Prompt Overlay */}
          {showInstallPrompt && (
            <div className="absolute inset-0 z-[900] bg-slate-950/85 backdrop-blur-md flex items-center justify-center px-4 rounded-[44px] overflow-hidden animate-fade-in">
              <div className="w-full max-w-[280px] bg-slate-900/90 border border-slate-700/60 p-5 rounded-3xl shadow-2xl flex flex-col items-center text-center relative border-indigo-500/20">
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowInstallPrompt(false);
                    playAudioBeep(440, 0.05, 'sine');
                    triggerToast("📲 You can install MunchiDate anytime via your browser settings!");
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs p-1 rounded-full hover:bg-white/10"
                  aria-label="Close"
                >
                  ✕
                </button>

                {/* App Icon Glow Preview */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-0.5 shadow-lg shadow-pink-500/20 mb-3 animate-pulse">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
                    <img src="/favicon-96x96.png" className="w-11 h-11 object-contain" alt="MunchiDate App Icon" />
                  </div>
                </div>

                {/* Title & Copy */}
                <h3 className="text-sm font-bold text-white font-outfit tracking-wide">Install MunchiDate App</h3>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                  Add MunchiDate to your phone's Home Screen for the ultimate dating and matching experience!
                </p>

                {/* Benefits Badges */}
                <div className="flex gap-2.5 my-3.5">
                  <div className="flex items-center gap-1 text-[8.5px] text-pink-400 font-semibold bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/10">
                    ⚡ Fast Launch
                  </div>
                  <div className="flex items-center gap-1 text-[8.5px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10">
                    🔔 Match Alerts
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={() => {
                    setShowInstallPrompt(false);
                    // Positive double chime
                    playAudioBeep(523.25, 0.1, 'triangle');
                    setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
                    triggerToast("📱 MunchiDate has been successfully added to your phone Home Screen!");
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-indigo-500 hover:from-pink-600 hover:to-indigo-600 text-white font-bold rounded-xl text-[10.5px] shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-pink-500/10"
                >
                  📲 Install Mobile App
                </button>

                {/* Dismiss Link */}
                <button 
                  onClick={() => {
                    setShowInstallPrompt(false);
                    playAudioBeep(440, 0.05, 'sine');
                    triggerToast("📲 You can install MunchiDate anytime via your browser settings!");
                  }}
                  className="mt-2 text-[9.5px] text-slate-500 hover:text-slate-300 font-semibold tracking-wide cursor-pointer transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          )}

          {/* High-Fidelity Desktop Shortcut Prompt Overlay */}
          {showDesktopPrompt && (
            <div className="absolute inset-0 z-[900] bg-slate-950/85 backdrop-blur-md flex items-center justify-center px-4 rounded-[44px] overflow-hidden animate-fade-in">
              <div className="w-full max-w-[280px] bg-slate-900/90 border border-slate-700/60 p-5 rounded-3xl shadow-2xl flex flex-col items-center text-center relative border-indigo-500/20">
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowDesktopPrompt(false);
                    playAudioBeep(440, 0.05, 'sine');
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs p-1 rounded-full hover:bg-white/10"
                  aria-label="Close"
                >
                  ✕
                </button>

                {/* PC/Desktop Icon Glow Preview */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20 mb-3 animate-pulse">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
                    <span className="text-3xl animate-bounce">🖥️</span>
                  </div>
                </div>

                {/* Title & Copy */}
                <h3 className="text-sm font-bold text-white font-outfit tracking-wide">Create Desktop Shortcut?</h3>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-medium">
                  Launch MunchiDate instantly from your PC Desktop to stay updated on new matches and upcoming dates!
                </p>

                {/* Benefits Badges */}
                <div className="flex gap-2.5 my-3.5">
                  <div className="flex items-center gap-1 text-[8.5px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10">
                    💻 Desktop Icon
                  </div>
                  <div className="flex items-center gap-1 text-[8.5px] text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/10">
                    🚀 Instant Access
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={() => {
                    setShowDesktopPrompt(false);
                    // Positive double chime
                    playAudioBeep(523.25, 0.1, 'triangle');
                    setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
                    triggerToast("💻 MunchiDate Desktop shortcut icon created on your PC Desktop! 🚀");
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold rounded-xl text-[10.5px] shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-indigo-500/10"
                >
                  🖥️ Create Desktop Shortcut
                </button>

                {/* Dismiss Link */}
                <button 
                  onClick={() => {
                    setShowDesktopPrompt(false);
                    playAudioBeep(440, 0.05, 'sine');
                  }}
                  className="mt-2 text-[9.5px] text-slate-500 hover:text-slate-300 font-semibold tracking-wide cursor-pointer transition-colors"
                >
                  No, Thanks
                </button>
              </div>
            </div>
          )}

          {/* Toast Notification HUD */}
          {toastMessage && (
            <div className="absolute top-12 left-4 right-4 bg-slate-950/95 backdrop-blur-md border border-indigo-500/50 p-3 rounded-2xl z-[100] shadow-lg flex items-center gap-2.5 animate-slide-up">
              <div className="w-6 h-6 rounded-lg bg-indigo-650/25 flex items-center justify-center text-indigo-400 text-xs shrink-0 animate-pulse">
                💖
              </div>
              <span className="text-[10.5px] text-slate-200 font-bold font-outfit text-left leading-snug">{toastMessage}</span>
            </div>
          )}

          {/* Status Bar */}
          <div className="h-10 pt-3.5 px-6 flex justify-between items-center text-[10.5px] text-white font-semibold font-outfit z-40 select-none">
            <span>4:09 PM</span>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4.5 h-2.5 border border-white/60 rounded-[3px] p-[1px] flex">
                <div className="w-full h-full bg-white rounded-[1.5px]"></div>
              </div>
            </div>
          </div>

          {/* ================= MAIN CONTAINER BODY ================= */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            
            {/* ----------------- TAB A: DEALS FEED ----------------- */}
            {activeTab === 'feed' && (
              <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
                
                {/* Custom App Header */}
                <div className="px-5 pt-2 pb-3 flex flex-col items-center justify-center relative w-full border-b border-slate-800/40 bg-slate-900/40 backdrop-blur-md">
                  <div className="flex flex-col items-center">
                    <img src="/munchidate_logo.png?v=10" alt="Munchi Date Logo" className="h-14 object-contain filter drop-shadow-md" />
                    <span className="text-[9px] text-indigo-400 font-bold tracking-wider uppercase mt-1.5 block text-center">Local Foodie Directory</span>
                  </div>
                  {/* User Profile Avatar / Login trigger */}
                  <div 
                    onClick={() => {
                      playAudioBeep(523.25, 0.05, 'sine');
                      setShowAuthModal(true);
                      if (user) {
                        triggerToast(`👤 Foodie: ${user.name} | Tier: ${user.is_premium ? "Premium 👑" : "Free 🎟️"}`);
                      }
                    }}
                    className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-all select-none shadow-md border-indigo-500/30 bg-indigo-950/20 animate-glow-ring"
                    title={user ? `${user.name} (View Profile / Logout)` : "Sign In / Register"}
                  >
                    {user ? (
                      <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-indigo-400">👤</span>
                    )}
                  </div>
                </div>

                {/* Day of Week Selector Bar */}
                <div className="px-3 pb-3 overflow-x-auto no-scrollbar flex gap-2">
                  {daysOfWeek.map((day) => {
                    const isActive = day === selectedDay;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2.5 rounded-full text-xs font-bold font-outfit transition-all duration-300 shrink-0 cursor-pointer ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/35 scale-105' 
                            : 'bg-slate-800/60 text-slate-400 border border-slate-700/30 hover:bg-slate-800'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {/* Search & Filtering Panel */}
                <div className="px-4 pb-3 flex flex-col gap-2">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tacos, oysters, mimosas..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700/50 rounded-2xl py-2 px-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/40 transition-all duration-300"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Neighborhood Selector Chips */}
                  <div className="overflow-x-auto no-scrollbar flex gap-1.5 py-1">
                    {neighborhoods.map((nh) => {
                      const isActive = nh === selectedNeighborhood;
                      return (
                        <button
                          key={nh}
                          onClick={() => setSelectedNeighborhood(nh)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold font-outfit transition-all duration-200 shrink-0 cursor-pointer ${
                            isActive 
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' 
                              : 'bg-slate-800/30 text-slate-500 border border-slate-800 hover:text-slate-400'
                          }`}
                        >
                          {nh}
                        </button>
                      );
                    })}
                  </div>
              </div>

              {/* Cards List Grid */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3.5 no-scrollbar">
                
                {/* Casino Slot Machine Daily Deal Grabber Card */}
                <div 
                  onClick={() => setShowSlotModal(true)}
                  className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 hover:from-amber-500/15 hover:to-indigo-500/15 border border-amber-500/35 rounded-3xl p-4 flex items-center justify-between shadow-md relative overflow-hidden group cursor-pointer transition-all duration-300 active:scale-[0.98] animate-gold-pulse shrink-0"
                >
                  <div className="absolute -right-4 -bottom-4 text-5xl opacity-10 rotate-12 select-none">🎰</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                      🎰
                    </div>
                    <div className="text-left">
                      <h3 className="text-xs font-black text-amber-400 font-outfit uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        Daily Deal Grabber
                        <span className="bg-rose-650 text-white text-[8px] px-1.5 py-0.5 rounded-full uppercase font-black tracking-normal">SPIN & WIN</span>
                      </h3>
                      <p className="text-[10px] text-slate-300 font-semibold mt-1 leading-snug">Pull the casino lever to scan today's best food deals near you!</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>

                {/* Viral Loop #3: Golden Ticket $150 Draw Banner */}
                <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-orange-500/10 border border-yellow-500/35 rounded-3xl p-4 flex flex-col shadow-md relative overflow-hidden select-none shrink-0 border-dashed animate-gold-pulse">
                  {/* Background Glow */}
                  <div className="absolute right-0 top-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                      <span className="text-[7.5px] font-black bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase tracking-wider font-outfit">
                        WEEKLY GOLDEN DRAW
                      </span>
                      <h3 className="text-[12.5px] font-black text-white font-outfit tracking-wide mt-1.5 leading-tight">
                        🎫 $150 Munchi Golden Ticket Drop
                      </h3>
                      <p className="text-[9.5px] text-slate-400 mt-1 leading-relaxed font-semibold">
                        Win a fully sponsored premium dining date at any Munchi venue this Friday night!
                      </p>
                    </div>
                    <div className="text-2xl animate-bounce">🎫</div>
                  </div>

                  {/* Timer and Draw Status */}
                  <div className="flex items-center justify-between border-t border-yellow-500/20 pt-3 mt-3">
                    <div className="text-left">
                      <span className="text-[6.5px] text-slate-500 font-bold uppercase tracking-wider">DRAW CLOSES IN</span>
                      <div className="text-[10px] font-black text-yellow-400 font-mono tracking-wider">3d : 14h : 42m : 18s</div>
                    </div>
                    
                    {isRegisteredGoldenTicket ? (
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/35 text-[8.5px] font-bold rounded-xl flex items-center gap-1 animate-pulse">
                        ✓ REGISTERED FOR DRAW
                      </span>
                    ) : (
                      <button 
                        onClick={() => {
                          playAudioBeep(523.25, 0.1, 'triangle');
                          setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
                          setIsRegisteredGoldenTicket(true);
                          triggerToast("🎟️ Entered draw! Share link with a foodie buddy to double entry chances! 🚀");
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-[8.5px] shadow-md transition-all active:scale-95 cursor-pointer shadow-yellow-500/20"
                      >
                        🎟️ Enter Draw
                      </button>
                    )}
                  </div>
                </div>

                {/* Viral Loop #2: Daily Food Debate Interactive Poll Panel */}
                <div className="bg-slate-850/40 border border-slate-700/40 rounded-3xl p-4 flex flex-col shadow-sm text-left select-none relative shrink-0">
                  <div className="absolute right-4 top-4 text-[8px] font-bold text-indigo-400 font-outfit uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10">
                    🗳️ Daily Debate
                  </div>
                  
                  <span className="text-[7.5px] text-indigo-400 font-bold uppercase tracking-widest font-outfit">
                    Local Foodie Poll
                  </span>
                  <h3 className="text-[11.5px] font-extrabold text-white font-outfit mt-1 leading-snug">
                    Pineapple on Pizza: Genius or Jail? 🍕🍍
                  </h3>
                  <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium leading-relaxed">
                    Cast your vote to settle the debate and unlock matching foodies nearby!
                  </p>

                  {/* Options / Progress Bars */}
                  <div className="mt-3 space-y-2">
                    {hasVotedDebate ? (
                      <>
                        {/* Option 1 Voted */}
                        <div className="relative w-full h-7 bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex items-center justify-between px-3">
                          <div className="absolute left-0 top-0 bottom-0 bg-indigo-500/20 transition-all duration-1000 ease-out" style={{ width: '73%' }} />
                          <span className="text-[9px] text-white font-bold z-10 flex items-center gap-1.5">🍕 Absolute Genius <span className="text-indigo-400 text-[8px]">(Your Vote)</span></span>
                          <span className="text-[9px] text-indigo-300 font-black z-10">73%</span>
                        </div>
                        {/* Option 2 */}
                        <div className="relative w-full h-7 bg-slate-950 border border-slate-850 rounded-xl overflow-hidden flex items-center justify-between px-3">
                          <div className="absolute left-0 top-0 bottom-0 bg-slate-750/10 transition-all duration-1000 ease-out" style={{ width: '27%' }} />
                          <span className="text-[9px] text-slate-400 font-semibold z-10">🙅‍♂️ Straight to Jail</span>
                          <span className="text-[9px] text-slate-450 font-black z-10">27%</span>
                        </div>
                        {/* Share Debate Button */}
                        <button 
                          onClick={() => {
                            playAudioBeep(523.25, 0.1, 'sine');
                            triggerToast("🔗 Debate share link copied! Settle it on your group chat!");
                          }}
                          className="w-full mt-1.5 py-1.5 bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/50 font-semibold rounded-xl text-[8.5px] flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.97]"
                        >
                          🔗 Settle on WhatsApp / Group Chat
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            playAudioBeep(650, 0.05, 'triangle');
                            setHasVotedDebate(true);
                            setDebateVotes(prev => ({ ...prev, option1: prev.option1 + 1 }));
                            triggerToast("🗳️ Vote cast! 73% of Midtown matches agree with you!");
                          }}
                          className="flex-1 py-1.5 bg-slate-950 hover:bg-indigo-950/20 border border-slate-750 hover:border-indigo-500/40 text-white font-bold rounded-xl text-[9.5px] transition-all cursor-pointer active:scale-95"
                        >
                          🍕 Genius!
                        </button>
                        <button 
                          onClick={() => {
                            playAudioBeep(650, 0.05, 'triangle');
                            setHasVotedDebate(true);
                            setDebateVotes(prev => ({ ...prev, option2: prev.option2 + 1 }));
                            triggerToast("🗳️ Vote cast! You're in the spicy 27% minority!");
                          }}
                          className="flex-1 py-1.5 bg-slate-950 hover:bg-rose-950/20 border border-slate-750 hover:border-rose-500/40 text-white font-bold rounded-xl text-[9.5px] transition-all cursor-pointer active:scale-95"
                        >
                          🙅‍♂️ Jail!
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Viral Loop #5: Dual-Sided Referral promo panel */}
                <div className="bg-slate-850/40 border border-slate-700/40 rounded-3xl p-4 flex flex-col shadow-sm text-left select-none relative shrink-0">
                  <div className="absolute right-4 top-4 text-[8px] font-bold text-yellow-400 font-outfit uppercase tracking-widest bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/10">
                    🎁 Referral Promo
                  </div>
                  
                  <span className="text-[7.5px] text-yellow-400 font-bold uppercase tracking-widest font-outfit">
                    Earn Free Cocktails
                  </span>
                  <h3 className="text-[11.5px] font-extrabold text-white font-outfit mt-1 leading-snug">
                    Refer a Buddy - Get 2 Free Drinks! 🍹🍹
                  </h3>
                  <p className="text-[9.5px] text-slate-400 mt-0.5 font-medium leading-relaxed">
                    Share MunchiDate with a single friend. When they download, both of you unlock free craft drinks at any partner restaurant!
                  </p>

                  {/* Referral Code block */}
                  <div className="mt-3 flex gap-2">
                    <div className="flex-1 bg-slate-950 border border-slate-850 p-2 rounded-xl flex items-center justify-between">
                      <div className="text-left pl-1">
                        <div className="text-[6.5px] text-slate-500 font-bold uppercase">YOUR UNIQUE CODE</div>
                        <div className="text-[9.5px] text-white font-extrabold font-mono tracking-widest">MUNCHI-BUDDY-99</div>
                      </div>
                      <button 
                        onClick={() => {
                          playAudioBeep(523.25, 0.1, 'sine');
                          triggerToast("📋 Referral invite link copied successfully!");
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-750 text-white text-[8px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Code Activation Input */}
                  <div className="border-t border-slate-800/60 pt-2.5 mt-2.5">
                    {referralCodeEntered ? (
                      <button 
                        onClick={() => {
                          playAudioBeep(523.25, 0.1, 'triangle');
                          setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
                          setShowReferralVoucher(true);
                        }}
                        className="w-full py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-950 font-bold rounded-xl text-[9.5px] flex items-center justify-center gap-1.5 cursor-pointer shadow-orange-500/10 shadow-sm animate-pulse"
                      >
                        🍹 View Unlocked Cocktails Voucher
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Enter friend's referral code..." 
                          value={referralCodeInput}
                          onChange={(e) => setReferralCodeInput(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1 text-[9px] text-white focus:outline-none focus:border-yellow-500/50"
                        />
                        <button 
                          onClick={() => {
                            if (referralCodeInput.trim() !== '') {
                              playAudioBeep(523.25, 0.1, 'triangle');
                              setTimeout(() => playAudioBeep(659.25, 0.15, 'triangle'), 100);
                              setReferralCodeEntered(true);
                              setShowReferralVoucher(true);
                              if (referralCodeInput.includes('invite=') || referralCodeInput.includes('munchidate.com')) {
                                setIsGuestJoined(true);
                                triggerToast("🎁 Welcome Guest! Referral ticket pass synced and 2 free craft drinks unlocked!");
                              } else {
                                triggerToast("🎁 Referral code verified successfully! 2 Free Cocktails Vouchers unlocked!");
                              }
                            } else {
                              playAudioBeep(180, 0.15, 'sawtooth');
                              triggerToast("❌ Please enter a valid referral code!");
                            }
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700/50 hover:text-white rounded-xl text-[9px] font-bold cursor-pointer transition-colors"
                        >
                          Claim
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {filteredDeals.length > 0 ? (
                  filteredDeals.map((deal, index) => {
                    const isFavorite = favorites.includes(deal.name);
                    const isSaved = savedSpecials.includes(deal.name);
                    return (
                      <div 
                        key={`${deal.name}-${deal.day}-${index}`}
                        onClick={() => setSelectedRestaurant(deal)}
                        className="bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/30 rounded-3xl overflow-hidden shadow-md flex flex-col relative transition-all duration-300 cursor-pointer animate-slide-up group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {/* Image Banner */}
                        <div className="h-32 w-full overflow-hidden relative">
                          <img 
                            src={deal.image} 
                            alt={deal.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {/* Glassmorphic Tag & Distance Badge */}
                          <div className="absolute top-3 left-3 flex gap-1.5">
                            <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
                              {deal.neighborhood}
                            </div>
                            {userLocation && (
                              <div className="bg-indigo-600/90 backdrop-blur-md border border-indigo-500/20 px-2.5 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-wider">
                                📍 {calculateDistance(userLocation.lat, userLocation.lng, deal.lat, deal.lng)} mi
                              </div>
                            )}
                          </div>
                          
                          {/* Heart & Save Action Buttons */}
                          <div className="absolute top-3 right-3 flex gap-2">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSaveSpecial(deal.name);
                                }}
                                className={`w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center border transition-all duration-300 cursor-pointer ${
                                  isSaved 
                                    ? 'bg-amber-500 border-amber-400 text-white' 
                                    : 'bg-slate-900/60 border-white/10 text-white hover:bg-slate-900'
                                }`}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(deal.name);
                                }}
                                className={`w-7 h-7 rounded-full backdrop-blur-md flex items-center justify-center border transition-all duration-300 cursor-pointer ${
                                  isFavorite 
                                    ? 'bg-rose-600 border-rose-500 text-white' 
                                    : 'bg-slate-900/60 border-white/10 text-white hover:bg-slate-900'
                                }`}
                              >
                                <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Info Body */}
                          <div className="p-4 flex flex-col justify-between">
                            <div className="space-y-1">
                              <h3 className="font-bold text-white font-outfit text-sm group-hover:text-indigo-400 transition-colors">{deal.name}</h3>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span className="truncate">{deal.address}</span>
                              </div>
                            </div>
                            <div className="mt-3.5 pt-3 border-t border-slate-700/30 flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-300 max-w-[210px] leading-tight line-clamp-1">{deal.specials}</span>
                              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-all group-hover:translate-x-0.5" />
                            </div>

                            {/* Actions side-by-side: Make it a Date and Eat Alone */}
                            <div className="flex gap-2 mt-3.5 w-full">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // prevent opening details modal
                                  setDateRestaurant(deal);
                                  setShowDateFlow(true);
                                  setDateFlowStep('intro');
                                  setDateQuizQuestionIndex(0);
                                  setDateQuizAnswers({});
                                  setDateMatchedCandidates([]);
                                  setDateSelectedMatch(null);
                                  setDatePickedCalendarDate(null);
                                  setDatePassAddedToCalendar(false);
                                  playAudioBeep(523.25, 0.1, 'sine');
                                  setTimeout(() => playAudioBeep(659.25, 0.15, 'sine'), 100);
                                }}
                                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-450 hover:to-rose-550 text-white py-2 rounded-xl text-[10px] font-black font-outfit shadow-sm hover:shadow-pink-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer animate-glow-ring"
                              >
                                💖 Make it a Date
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // prevent double modal triggers
                                  setSelectedRestaurant(deal);
                                  playAudioBeep(349.23, 0.08, 'triangle');
                                }}
                                className="flex-1 bg-slate-700/50 hover:bg-slate-700/80 border border-slate-650/40 text-slate-100 py-2 rounded-xl text-[10px] font-bold font-outfit shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                🍽️ Eat Alone
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                        <Filter className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-slate-400 font-semibold text-sm">No specials found</p>
                        <p className="text-slate-600 text-[11px] mt-1">Try expanding your search or selecting a different day.</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ----------------- TAB B: EXPLORE / RESTAURANT SWIPER ----------------- */}
            {activeTab === 'explore' && (
              <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden animate-fade-in select-none">
                
                {/* Floating Header */}
                <div className="px-4 pt-3 pb-2 flex flex-col items-center justify-center relative w-full border-b border-slate-800/40 bg-slate-900/40 backdrop-blur-md shrink-0">
                  <div className="flex flex-col items-center mb-2">
                    <img src="/munchidate_logo.png?v=10" alt="Munchi Date Logo" className="h-10 object-contain filter drop-shadow-md" />
                  </div>

                  {/* Sliding glassmorphic pill toggle */}
                  <div className="flex bg-slate-950/60 p-0.5 rounded-full border border-slate-800/80 w-[240px] relative select-none shrink-0 mb-1">
                    <div 
                      className="absolute top-0.5 bottom-0.5 rounded-full bg-indigo-600 transition-all duration-300 shadow-md"
                      style={{
                        left: exploreMode === 'cards' ? '2px' : '118px',
                        width: '120px'
                      }}
                    ></div>
                    <button 
                      onClick={() => {
                        setExploreMode('cards');
                        playAudioBeep(440, 0.08, 'sine');
                      }}
                      className={`flex-1 text-[9.5px] font-black uppercase py-1.5 text-center rounded-full relative z-10 transition-all cursor-pointer ${exploreMode === 'cards' ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      🎴 Swipe Cards
                    </button>
                    <button 
                      onClick={() => {
                        setExploreMode('reels');
                        playAudioBeep(523.25, 0.08, 'sine');
                      }}
                      className={`flex-1 text-[9.5px] font-black uppercase py-1.5 text-center rounded-full relative z-10 transition-all cursor-pointer ${exploreMode === 'reels' ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                      📲 Watch Reels
                    </button>
                  </div>

                  {/* Neighborhood Selector Chip inside Swiper / Reels */}
                  <div className="overflow-x-auto no-scrollbar flex gap-1 mt-1.5 max-w-full">
                    {neighborhoods.slice(0, 7).map((nh) => {
                      const isActive = nh === selectedNeighborhood;
                      return (
                        <button
                          key={nh}
                          onClick={() => {
                            setSelectedNeighborhood(nh);
                            setCurrentCardIndex(0);
                            setCurrentVideoIndex(0);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold font-outfit transition-all shrink-0 cursor-pointer ${
                            isActive 
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm' 
                              : 'bg-slate-800/30 text-slate-500 border border-slate-800 hover:text-slate-400'
                          }`}
                        >
                          {nh}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {exploreMode === 'cards' ? (
                  exploreCards.length > 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
                      
                      {/* SWIPABLE CARD CONTAINER */}
                      <div className="w-full max-w-[285px] h-[375px] relative flex items-center justify-center shrink-0">
                        
                        {/* 1. BACK CARD (Stacked Depth Effect) */}
                        {exploreCards.length > 1 && (
                          <div 
                            className="absolute w-full h-full bg-slate-900/90 border border-slate-850/80 rounded-[28px] shadow-lg flex flex-col overflow-hidden select-none pointer-events-none transition-all duration-300"
                            style={{
                              transform: `scale(${isDragging ? 0.96 : 0.94}) translateY(${isDragging ? '4px' : '8px'})`,
                              zIndex: 10,
                              opacity: 0.55
                            }}
                          >
                            {/* Image Placeholder */}
                            <div className="h-44 w-full bg-slate-950 overflow-hidden relative opacity-30">
                              <img 
                                src={exploreCards[(currentCardIndex + 1) % exploreCards.length].image} 
                                alt="Next spot"
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <div className="p-4 space-y-1.5">
                              <div className="w-1/2 h-3.5 bg-slate-850 rounded"></div>
                              <div className="w-3/4 h-2.5 bg-slate-850 rounded"></div>
                              <div className="w-full h-6 bg-indigo-950/20 rounded-xl mt-3"></div>
                            </div>
                          </div>
                        )}

                        {/* 2. TOP ACTIVE SWIPABLE CARD */}
                        {(() => {
                          const activeIdx = Math.min(currentCardIndex, exploreCards.length - 1);
                          const card = exploreCards[activeIdx];
                          
                          return (
                            <div
                              onMouseDown={handleDragStart}
                              onMouseMove={(e) => handleDragMove(e, exploreCards)}
                              onMouseUp={() => handleDragEnd(exploreCards)}
                              onMouseLeave={() => handleDragEnd(exploreCards)}
                              onTouchStart={handleDragStart}
                              onTouchMove={(e) => handleDragMove(e, exploreCards)}
                              onTouchEnd={() => handleDragEnd(exploreCards)}
                              className="absolute w-full h-full bg-slate-900 border border-slate-700/50 rounded-[28px] shadow-2xl flex flex-col overflow-hidden select-none cursor-grab active:cursor-grabbing"
                              style={{
                                transform: `translate(${swipeOffsetX}px, ${swipeOffsetY}px) rotate(${swipeOffsetX * 0.04}deg)`,
                                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                zIndex: 20
                              }}
                            >
                              {/* Visual Overlay Swipe Stamp: Left (Pass) */}
                              {swipeDirection === 'left' && (
                                <div className="absolute top-12 right-6 z-35 border-3 border-rose-500 text-rose-500 font-black text-xs uppercase tracking-widest px-3 py-1 rounded-[4px] rotate-12 scale-125 bg-slate-950/80 backdrop-blur-sm pointer-events-none shadow-lg animate-pulse">
                                  🙅‍♂️ PASS
                                </div>
                              )}

                              {/* Visual Overlay Swipe Stamp: Right (Visit) */}
                              {swipeDirection === 'right' && (
                                <div className="absolute top-12 left-6 z-35 border-3 border-emerald-500 text-emerald-500 font-black text-xs uppercase tracking-widest px-3 py-1 rounded-[4px] -rotate-12 scale-125 bg-slate-950/80 backdrop-blur-sm pointer-events-none shadow-lg animate-pulse">
                                  🍽️ VISIT
                                </div>
                              )}

                              {/* Restaurant Image Banner */}
                              <div className="h-44 w-full overflow-hidden relative pointer-events-none">
                                <img 
                                  src={card.image} 
                                  alt={card.name} 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                                
                                {/* Bottom Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                                
                                {/* Day Badge */}
                                <span className="absolute top-3 left-3 bg-pink-500/90 backdrop-blur-sm text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm border border-pink-400/20">
                                  {card.day}
                                </span>

                                {/* Neighborhood Tag */}
                                <span className="absolute bottom-3 left-3 bg-slate-950/75 backdrop-blur-sm text-slate-300 text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-slate-800">
                                  {card.neighborhood}
                                </span>
                              </div>

                              {/* Details Panel */}
                              <div className="flex-1 p-4.5 flex flex-col justify-between text-left pointer-events-none">
                                <div className="space-y-1">
                                  <h3 className="text-sm font-extrabold text-white font-outfit tracking-wide leading-tight flex items-center gap-1.5">
                                    {card.name}
                                  </h3>
                                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                                    <span className="truncate">{card.address}</span>
                                  </p>
                                </div>

                                {/* Restaurant Deal specials info */}
                                <div className="bg-indigo-950/30 border border-indigo-500/15 p-2.5 rounded-2xl flex flex-col justify-center mt-2.5">
                                  <span className="text-[7.5px] font-black text-indigo-400 uppercase tracking-widest">Sponsored Deal</span>
                                  <p className="text-[10px] font-bold text-slate-200 tracking-tight leading-snug line-clamp-2 mt-0.5">{card.specials}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* BOTTOM SWIPE ACTIONS BUTTONS BAR */}
                      <div className="flex items-center justify-center gap-5 mt-4 shrink-0">
                        
                        {/* Swipe Left Button: Pass */}
                        <button 
                          onClick={() => handleSwipeAction('left', exploreCards)}
                          className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-500 hover:text-rose-400 shadow-lg hover:border-rose-500/20 active:scale-90 transition-all cursor-pointer"
                          title="Pass on this place"
                        >
                          <span className="text-xl font-bold">✕</span>
                        </button>

                        {/* Info Button: View Details */}
                        <button 
                          onClick={() => {
                            const activeIdx = Math.min(currentCardIndex, exploreCards.length - 1);
                            const card = exploreCards[activeIdx];
                            if (card) {
                              setSelectedRestaurant(card);
                              playAudioBeep(523.25, 0.1, 'sine');
                            }
                          }}
                          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 hover:text-indigo-300 shadow-md active:scale-90 transition-all cursor-pointer"
                          title="View details"
                        >
                          <span className="text-base font-bold font-mono">ℹ️</span>
                        </button>

                        {/* Swipe Right Button: Would Visit */}
                        <button 
                          onClick={() => handleSwipeAction('right', exploreCards)}
                          className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-500 hover:text-emerald-400 shadow-lg hover:border-emerald-500/20 active:scale-90 transition-all cursor-pointer"
                          title="Would love to visit!"
                        >
                          <span className="text-lg">💖</span>
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <Video className="w-12 h-12 text-slate-500 animate-bounce" />
                      <p className="text-slate-400 font-semibold">No swipable cards available</p>
                      <p className="text-slate-600 text-xs">Try selecting a different neighborhood filter.</p>
                    </div>
                  )
                ) : (
                  exploreVideos.length > 0 ? (
                    <div 
                      className="flex-1 w-full relative overflow-hidden bg-black flex flex-col"
                      onTouchStart={handleReelsDragStart}
                      onTouchMove={handleReelsDragMove}
                      onTouchEnd={handleReelsDragEnd}
                      onMouseDown={handleReelsDragStart}
                      onMouseMove={handleReelsDragMove}
                      onMouseUp={handleReelsDragEnd}
                      onMouseLeave={handleReelsDragEnd}
                    >
                      {/* Scrolling Stack */}
                      <div 
                        className="absolute inset-0 w-full h-full flex flex-col"
                        style={{
                          transform: `translateY(calc(-${currentVideoIndex * 105}% + ${reelsDragOffsetY}px))`,
                          transition: isReelsDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        {exploreVideos.map((deal, idx) => {
                          const isActive = idx === currentVideoIndex;
                          return (
                            <div 
                              key={`${deal.name}-${idx}`} 
                              className="w-full h-full relative flex-shrink-0 bg-slate-950 overflow-hidden flex items-center justify-center"
                              style={{ height: '100%' }}
                            >
                              <video
                                ref={el => videoRefs.current[idx] = el}
                                src={deal.video}
                                loop
                                playsInline
                                muted={isReelsMuted}
                                className="w-full h-full object-cover pointer-events-none"
                                preload={Math.abs(idx - currentVideoIndex) <= 1 ? "auto" : "none"}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />
                              {!isActive && (
                                <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm pointer-events-none" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Glassmorphic HUD overlay */}
                      {exploreVideos[currentVideoIndex] && (() => {
                        const activeVideo = exploreVideos[currentVideoIndex];
                        return (
                          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-30">
                            <div className="w-full flex justify-between items-center pt-2">
                              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1 rounded-full text-[9px] font-black uppercase text-pink-400 tracking-wider flex items-center gap-1">
                                ✨ {activeVideo.neighborhood}
                              </div>
                              <button
                                onClick={() => {
                                  setIsReelsMuted(prev => !prev);
                                  playAudioBeep(600, 0.08, 'sine');
                                }}
                                className="pointer-events-auto w-9 h-9 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-800 flex items-center justify-center text-white active:scale-90 transition-all shadow-md cursor-pointer"
                              >
                                {isReelsMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                              </button>
                            </div>

                            <div className="w-full flex flex-col gap-3 pb-2 mt-auto">
                              <div className="bg-slate-950/75 backdrop-blur-lg border border-slate-800/80 p-4 rounded-3xl flex flex-col gap-2 shadow-2xl text-left pointer-events-auto">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="text-sm font-extrabold text-white font-outfit tracking-wide flex items-center gap-1.5 leading-tight">
                                      {activeVideo.name}
                                      <span className="text-[10px] text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider font-outfit shrink-0">
                                        Vibe Badge
                                      </span>
                                    </h3>
                                    <p className="text-[10.5px] text-slate-300 font-semibold truncate flex items-center gap-1 mt-1">
                                      <MapPin className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                                      {userLocation && (
                                        <span className="text-indigo-400 font-bold tracking-tight">
                                          ({calculateDistance(userLocation.lat, userLocation.lng, activeVideo.lat, activeVideo.lng)} mi) •{' '}
                                        </span>
                                      )}
                                      <span className="text-slate-400">{activeVideo.address}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-indigo-950/20 border border-indigo-500/10 p-3 rounded-2xl flex flex-col mt-1">
                                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Sponsored Deal</span>
                                  <p className="text-[10.5px] font-bold text-slate-200 tracking-tight leading-snug line-clamp-2 mt-0.5">
                                    {activeVideo.specials}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  <button
                                    onClick={() => {
                                      setSelectedRestaurant(activeVideo);
                                      playAudioBeep(523.25, 0.1, 'sine');
                                    }}
                                    className="py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-bold border border-slate-800 rounded-xl text-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md"
                                  >
                                    ℹ️ Details
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDateRestaurant(activeVideo);
                                      setShowDateFlow(true);
                                      setDateFlowStep('intro');
                                      setDateQuizQuestionIndex(0);
                                      setDateQuizAnswers({});
                                      setDateMatchedCandidates([]);
                                      setDateSelectedMatch(null);
                                      setDatePickedCalendarDate(null);
                                      setDatePassAddedToCalendar(false);
                                      playAudioBeep(523.25, 0.1, 'sine');
                                      setTimeout(() => playAudioBeep(659.25, 0.15, 'sine'), 100);
                                    }}
                                    className="py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-450 text-white font-black rounded-xl text-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
                                  >
                                    💖 Date
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                      <Video className="w-12 h-12 text-slate-500 animate-bounce" />
                      <p className="text-slate-400 font-semibold">No Reels available</p>
                      <p className="text-slate-600 text-xs">Try selecting a different neighborhood filter.</p>
                    </div>
                  )
                )}
              </div>
            )}
            
            {/* ----------------- TAB C: GEOLOCATION STREET VIEW MAP ----------------- */}
            {activeTab === 'map' && (
              <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950 animate-fade-in select-none">
                
                {/* Street View Panorama Target element */}
                <div 
                  ref={streetViewRef} 
                  className="absolute inset-0 z-0 bg-[#0f172a]"
                ></div>

                {/* Loading State Overlay */}
                {streetViewStatus === 'loading' && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-center p-6 space-y-4 animate-fade-in">
                    <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest font-outfit">Loading Real-World View</p>
                      <p className="text-slate-600 text-[10px] mt-1 font-medium">Fetching 360° Google Street View imagery...</p>
                    </div>
                  </div>
                )}



                {/* Clean Fallback Layout: Coordinates Lack Street View Imagery */}
                {mapSelectedRestaurant && streetViewStatus === 'no_imagery' && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0f1d] p-6 text-center space-y-5 animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-indigo-400 shadow-md">
                      <MapPin className="w-8 h-8 animate-bounce" />
                    </div>
                    <div className="max-w-xs space-y-2">
                      <h4 className="text-sm font-bold text-white font-outfit uppercase tracking-wider">No 360° Imagery Found</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Google Street View is unavailable for <span className="text-white font-semibold">{mapSelectedRestaurant.name}</span>. But don't worry! You can see the full deal and map directions below.
                      </p>
                    </div>
                    {/* Dynamic Mini Map Card fallback style */}
                    <div className="w-full bg-slate-900/50 border border-slate-800 p-3 rounded-2xl flex items-center gap-2.5 max-w-xs text-left">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none">Coordinates</span>
                        <p className="text-[10.5px] text-slate-300 font-mono truncate">{mapSelectedRestaurant.lat.toFixed(4)}° N, {Math.abs(mapSelectedRestaurant.lng).toFixed(4)}° W</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Day/Spots Header Overlay */}
                <div className="absolute top-4 left-4 right-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-3 rounded-2xl z-20 flex flex-col items-center justify-center shadow-lg">
                  <div className="flex flex-col items-center">
                    <img src="/munchidate_logo.png?v=10" alt="Munchi Date Logo" className="h-12 object-contain filter drop-shadow-md" />
                    <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest leading-none mt-1.5 text-center">{selectedDay}'s Active Spots Map</span>
                  </div>
                  <button 
                    onClick={() => {
                      setMapSelectedRestaurant(null);
                      setMapHasBeenReset(true);
                      playAudioBeep(440, 0.08, 'sine');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all active:scale-95"
                  >
                    Reset
                  </button>
                </div>

                {/* Horizontal Spots Selection Chips */}
                <div className="absolute top-[102px] left-4 right-4 z-20 flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {filteredDeals.map((deal, index) => {
                    const isSelected = mapSelectedRestaurant?.name === deal.name;
                    return (
                      <button
                        key={`${deal.name}-${deal.day}-${index}`}
                        onClick={() => {
                          setMapSelectedRestaurant(deal);
                          playAudioBeep(659.25, 0.05, 'sine');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold font-outfit whitespace-nowrap transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 border border-rose-500 text-white shadow-lg shadow-rose-600/30 scale-105'
                            : 'bg-slate-900/95 border border-slate-800/80 text-slate-300 hover:bg-slate-850 hover:text-white backdrop-blur-md'
                        }`}
                      >
                        📍 {deal.name}
                      </button>
                    );
                  })}
                </div>

                {/* Map Bottom Card Overlay for Active Selected Spot */}
                {mapSelectedRestaurant && (
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-3xl z-20 shadow-xl flex gap-3 animate-slide-up">
                    <img 
                      src={mapSelectedRestaurant.image} 
                      alt={mapSelectedRestaurant.name}
                      className="w-16 h-16 rounded-2xl object-cover shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-white font-outfit truncate pr-2">{mapSelectedRestaurant.name}</h4>
                          <button 
                            onClick={() => {
                              setMapSelectedRestaurant(null);
                              setMapHasBeenReset(true);
                              playAudioBeep(370, 0.06, 'sine');
                            }} 
                            className="text-slate-500 hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                          {userLocation && (
                            <span className="text-indigo-400 font-bold">
                              ({calculateDistance(userLocation.lat, userLocation.lng, mapSelectedRestaurant.lat, mapSelectedRestaurant.lng)} mi)
                            </span>
                          )}
                          <span>{mapSelectedRestaurant.address}</span>
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-800">
                        <span className="text-[10.5px] font-bold text-indigo-300 line-clamp-1">{mapSelectedRestaurant.specials}</span>
                        <div className="flex gap-1.5 shrink-0">
                          <button 
                            onClick={() => {
                              setDateRestaurant(mapSelectedRestaurant);
                              setShowDateFlow(true);
                              setDateFlowStep('intro');
                              setDateQuizQuestionIndex(0);
                              setDateQuizAnswers({});
                              setDateMatchedCandidates([]);
                              setDateSelectedMatch(null);
                              setDatePickedCalendarDate(null);
                              setDatePassAddedToCalendar(false);
                              playAudioBeep(523.25, 0.1, 'sine');
                              setTimeout(() => playAudioBeep(659.25, 0.15, 'sine'), 100);
                            }}
                            className="text-[9px] bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-450 text-white font-black px-2 py-1 rounded-md cursor-pointer active:scale-95 transition-all animate-gold-pulse shadow-sm shadow-rose-500/10"
                          >
                            💖 Date
                          </button>
                          <button 
                            onClick={() => setSelectedRestaurant(mapSelectedRestaurant)}
                            className="text-[9px] bg-indigo-650 text-white font-bold px-2 py-1 rounded-md hover:bg-indigo-600 cursor-pointer active:scale-95 transition-all"
                          >
                            More
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Standard View Overlay (Peachtree St default coordinate) */}
                {!mapSelectedRestaurant && streetViewStatus === 'ok' && (
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl z-10 shadow-lg text-center animate-slide-up">
                    <span className="text-[10.5px] font-bold text-indigo-300 font-outfit">📍 Exploring Peachtree St. Select a restaurant above!</span>
                  </div>
                )}
                
              </div>
            )}

          </div>

          {/* ================= BOTTOM TAB NAVIGATION ================= */}
          <div className="h-[76px] pb-4 px-6 bg-slate-950/80 border-t border-slate-900 backdrop-blur-lg flex justify-around items-center z-40 select-none">
            {/* Feed Tab */}
            <button 
              onClick={() => {
                setActiveTab('feed');
                setSelectedRestaurant(null);
              }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'feed' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[9px] font-bold font-outfit uppercase">Specials</span>
            </button>

            {/* Explore Reels Tab */}
            <button 
              onClick={() => {
                setActiveTab('explore');
                setSelectedRestaurant(null);
              }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'explore' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Video className="w-5 h-5" />
              <span className="text-[9px] font-bold font-outfit uppercase">Explore</span>
            </button>

            {/* Map Tab */}
            <button 
              onClick={() => {
                setActiveTab('map');
                setSelectedRestaurant(null);
              }}
              className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                activeTab === 'map' ? 'text-indigo-400 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Map className="w-5 h-5" />
              <span className="text-[9px] font-bold font-outfit uppercase">Map</span>
            </button>
          </div>

          {/* iPhone Bottom Home Indicator Bar */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[130px] h-[4.5px] bg-white rounded-full z-45 opacity-65"></div>

          {/* ================= DETAIL DETAIL OVERLAY MODAL ================= */}
          {selectedRestaurant && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end animate-fade-in">
              <div 
                className="w-full bg-slate-900 rounded-t-[36px] border-t border-slate-800 p-5 flex flex-col shadow-2xl relative animate-slide-up max-h-[85%] overflow-y-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                
                {/* Swipe Handle Indicator */}
                <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto mb-4 shrink-0"></div>

                {/* Close Button */}
                <button 
                  onClick={() => setSelectedRestaurant(null)}
                  className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all z-20"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Modal Photo Header */}
                <div className="h-44 w-full rounded-2xl overflow-hidden relative mb-4 shrink-0">
                  <img 
                    src={selectedRestaurant.image} 
                    alt={selectedRestaurant.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-indigo-600/90 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    {selectedRestaurant.neighborhood}
                  </div>
                </div>

                {/* Restaurant Specs */}
                <div className="space-y-4">
                  <div className="space-y-1 text-left">
                    <h3 className="text-xl font-bold text-white font-outfit leading-tight">{selectedRestaurant.name}</h3>
                    <span className="inline-flex text-[9px] bg-slate-800 text-indigo-400 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Active: {selectedRestaurant.day}
                    </span>
                  </div>

                  {/* The Special Deal Details Card */}
                  <div className="bg-indigo-600/10 border border-indigo-500/20 p-4 rounded-2xl text-left space-y-1">
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Active Special Offer</span>
                    <p className="text-sm font-bold text-indigo-300 leading-snug">{selectedRestaurant.specials}</p>
                  </div>

                  {/* Details Listing Grid */}
                  <div className="space-y-3 pt-2">
                    {/* Address */}
                    <div className="flex gap-3 text-left">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          Location
                          {userLocation && (
                            <span className="text-[8.5px] bg-indigo-650/80 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded font-black leading-none">
                              📍 {calculateDistance(userLocation.lat, userLocation.lng, selectedRestaurant.lat, selectedRestaurant.lng)} mi away
                            </span>
                          )}
                        </span>
                        <p className="text-xs text-slate-300 leading-tight font-medium mt-0.5">{selectedRestaurant.address}</p>
                      </div>
                    </div>

                    {/* Instagram Handle */}
                    <div className="flex gap-3 text-left">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Instagram</span>
                        <p className="text-xs text-indigo-300 leading-tight font-bold font-outfit">{selectedRestaurant.ig}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons Container */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
                    <button 
                      onClick={() => toggleSaveSpecial(selectedRestaurant.name)}
                      className={`py-3 rounded-2xl text-xs font-bold font-outfit border flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${
                        savedSpecials.includes(selectedRestaurant.name)
                          ? 'bg-amber-500 border-amber-400 text-white'
                          : 'bg-slate-800 border-slate-700/60 text-white hover:bg-slate-750'
                      }`}
                    >
                      <Bookmark className="w-4 h-4" />
                      {savedSpecials.includes(selectedRestaurant.name) ? 'Saved' : 'Save Deal'}
                    </button>
                    <button 
                      onClick={() => toggleFavorite(selectedRestaurant.name)}
                      className={`py-3 rounded-2xl text-xs font-bold font-outfit border flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${
                        favorites.includes(selectedRestaurant.name)
                          ? 'bg-rose-600 border-rose-500 text-white'
                          : 'bg-slate-800 border-slate-700/60 text-white hover:bg-slate-750'
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      {favorites.includes(selectedRestaurant.name) ? 'Liked' : 'Like Spot'}
                    </button>
                  </div>

                  {/* Make it a Date Social Connect Button */}
                  <button 
                    onClick={() => {
                      setDateRestaurant(selectedRestaurant);
                      setShowDateFlow(true);
                      setDateFlowStep('intro');
                      setDateQuizQuestionIndex(0);
                      setDateQuizAnswers({});
                      setDateMatchedCandidates([]);
                      setDateSelectedMatch(null);
                      setDatePickedCalendarDate(null);
                      setDatePassAddedToCalendar(false);
                      playAudioBeep(523.25, 0.1, 'sine');
                      setTimeout(() => playAudioBeep(659.25, 0.15, 'sine'), 100);
                    }}
                    className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-400 hover:to-pink-550 text-white py-3.5 rounded-2xl font-black font-outfit text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 active:scale-98 transition-all shrink-0 cursor-pointer animate-gold-pulse"
                  >
                    💖 Make it a Date
                  </button>

                  {/* External Links */}
                  <a 
                    href={userLocation 
                      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${encodeURIComponent(selectedRestaurant.name + ' ' + selectedRestaurant.address)}` 
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRestaurant.name + ' ' + selectedRestaurant.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-bold font-outfit text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-98 transition-all shrink-0 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" /> Get Directions
                  </a>

                </div>

              </div>
            </div>
          )}

          {/* ================= DYNAMIC CASINO DAILY SLOT MACHINE MODAL ================= */}
          {showSlotModal && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col justify-center items-center p-4 animate-fade-in">
              <div 
                className="w-full max-w-[340px] bg-slate-900 border-4 border-amber-500 rounded-[36px] p-5 shadow-2xl relative overflow-hidden flex flex-col items-center gap-4 animate-neon-marquee animate-slide-up"
                onClick={(e) => e.stopPropagation()}
              >
                
                {/* Blinking Marquee Casino Lights */}
                <div className="flex justify-between w-full px-2 mb-1 shrink-0 select-none">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-blink-dot-odd"></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-blink-dot-even"></span>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-blink-dot-odd"></span>
                  </div>
                  <span className="text-[10px] font-black text-amber-400 tracking-widest font-outfit uppercase animate-pulse">✨ DEAL GRABBER 777 ✨</span>
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-blink-dot-odd"></span>
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-blink-dot-even"></span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-blink-dot-odd"></span>
                  </div>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowSlotModal(false);
                    setSlotWinnerDeal(null);
                  }}
                  disabled={slotSpinning}
                  className="absolute top-3 right-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Slot Reels Cylinder Window */}
                <div className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 py-5 flex gap-3.5 justify-center items-center shadow-inner relative shrink-0 overflow-hidden">
                  
                  {/* Decorative horizontal lines */}
                  <div className="absolute left-0 right-0 h-[1.5px] bg-indigo-500/10 top-1/3 pointer-events-none"></div>
                  <div className="absolute left-0 right-0 h-[1.5px] bg-indigo-500/10 bottom-1/3 pointer-events-none"></div>

                  {/* Reel 1 */}
                  <div className="w-16 h-20 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden select-none">
                    <div className={`flex flex-col items-center justify-center w-full h-full transition-all duration-75 ${slotSpinning ? 'animate-reel-scroll' : ''}`}>
                      <span className="text-3xl filter drop-shadow-md">{reel1}</span>
                    </div>
                  </div>

                  {/* Reel 2 */}
                  <div className="w-16 h-20 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden select-none">
                    <div className={`flex flex-col items-center justify-center w-full h-full transition-all duration-75 ${slotSpinning ? 'animate-reel-scroll' : ''}`}>
                      <span className="text-3xl filter drop-shadow-md">{reel2}</span>
                    </div>
                  </div>

                  {/* Reel 3 */}
                  <div className="w-16 h-20 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden select-none">
                    <div className={`flex flex-col items-center justify-center w-full h-full transition-all duration-75 ${slotSpinning ? 'animate-reel-scroll' : ''}`}>
                      <span className="text-3xl filter drop-shadow-md">{reel3}</span>
                    </div>
                  </div>
                </div>

                {/* Status Screen Ticker & Retro Visual Pull Lever */}
                <div className="flex w-full items-center justify-between gap-4 shrink-0 select-none">
                  {/* Digital status display */}
                  <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center min-h-[70px] flex flex-col justify-center shadow-inner">
                    <span className="text-[8.5px] text-indigo-400 font-extrabold uppercase tracking-widest leading-none">
                      {slotStatusText}
                    </span>
                    <p className="text-[9.5px] text-slate-300 font-mono font-bold mt-1.5 uppercase leading-tight">
                      {slotTickerText}
                    </p>
                  </div>

                  {/* Casino Mechanical Lever Prop */}
                  <div className="flex flex-col items-center shrink-0 w-12 h-24 relative select-none">
                    {/* Metal bracket sleeve */}
                    <div className="w-3.5 h-12 bg-slate-800 border border-slate-700 rounded-full absolute bottom-4 left-1/2 -translate-x-1/2 shadow-inner"></div>
                    
                    {/* Steel rod stem */}
                    <div 
                      className={`w-1.5 h-14 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-100 ${
                        slotLeverPulled ? 'animate-pull-lever-rod' : 'origin-bottom'
                      }`}
                    ></div>
                    
                    {/* Red ball handle */}
                    <button 
                      onClick={handleLeverPull}
                      disabled={slotSpinning}
                      className={`w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800 border-2 border-rose-450 absolute left-1/2 -translate-x-1/2 cursor-pointer shadow-lg transition-all duration-100 active:scale-90 ${
                        slotLeverPulled ? 'animate-pull-lever-ball' : 'bottom-[76px] hover:scale-105 hover:border-rose-400'
                      } ${slotSpinning ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                    </button>
                    <span className="text-[8px] font-black text-slate-500 font-outfit uppercase absolute bottom-0 left-1/2 -translate-x-1/2 tracking-wider">LEVER</span>
                  </div>
                </div>

                {/* Daily Lock / Demo Mode Selector */}
                <div className="w-full flex justify-between items-center px-1.5 py-1 pt-2 border-t border-slate-800/80 shrink-0">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={slotDemoMode} 
                      onChange={(e) => setSlotDemoMode(e.target.checked)}
                      disabled={slotSpinning}
                      className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 bg-slate-800 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                    />
                    <span className="text-[9px] font-black text-indigo-400 font-outfit uppercase tracking-wider">Demo Mode</span>
                  </label>
                  
                  <span className={`text-[8.5px] font-black font-outfit uppercase tracking-wider px-2 py-0.5 rounded ${
                    dailyLimitReached 
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {dailyLimitReached ? 'Daily Pulled' : 'Lever Active'}
                  </span>
                </div>

                {/* Matched Proximity Deal Reveal Box */}
                {slotWinnerDeal && (
                  <div className="w-full bg-slate-950/80 border border-amber-500/40 p-3.5 rounded-[24px] flex flex-col gap-3 animate-slide-up relative overflow-hidden shrink-0 mt-1 shadow-2xl">
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white font-extrabold text-[8.5px] py-1 tracking-widest text-center uppercase animate-pulse">
                      🎰 JACKPOT FOOD PAIRING FOUND! 🎰
                    </div>
                    
                    <div className="flex gap-3 pt-3.5">
                      <img 
                        src={slotWinnerDeal.image} 
                        alt={slotWinnerDeal.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-800"
                      />
                      <div className="flex-1 text-left overflow-hidden space-y-0.5">
                        <h4 className="text-xs font-black text-white font-outfit truncate">{slotWinnerDeal.name}</h4>
                        <p className="text-[9px] text-slate-450 truncate flex items-center gap-0.5 leading-none">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          {userLocation && (
                            <span className="text-indigo-400 font-extrabold pr-0.5">
                              {calculateDistance(userLocation.lat, userLocation.lng, slotWinnerDeal.lat, slotWinnerDeal.lng)} mi
                            </span>
                          )}
                          <span>{slotWinnerDeal.address}</span>
                        </p>
                        <div className="pt-1">
                          <span className="inline-block text-[9.5px] font-black text-amber-400 leading-snug line-clamp-2 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                            🎁 {slotWinnerDeal.specials}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-0.5">
                      <a 
                        href={userLocation 
                          ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${encodeURIComponent(slotWinnerDeal.name + ' ' + slotWinnerDeal.address)}` 
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(slotWinnerDeal.name + ' ' + slotWinnerDeal.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-black py-2 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-lg shadow-indigo-650/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Route
                      </a>
                      <button 
                        onClick={() => {
                          setShowSlotModal(false);
                          setMapSelectedRestaurant(slotWinnerDeal);
                          setActiveTab('map');
                          setSlotWinnerDeal(null);
                        }}
                        className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[10px] font-black py-2 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                      >
                        <Map className="w-3.5 h-3.5 text-indigo-400" /> Focus Map
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

                    {/* ================= FOODIE "MAKE IT A DATE" MATCHMAKING MODAL ================= */}
          {showDateFlow && dateRestaurant && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 animate-fade-in animate-slide-up select-none">
              
              {/* Top Banner Context Card */}
              <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-3 shrink-0 flex items-center justify-between shadow-lg relative">
                <div className="flex gap-2.5 items-center overflow-hidden text-left">
                  <img 
                    src={dateRestaurant.image} 
                    alt={dateRestaurant.name}
                    className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-850"
                  />
                  <div className="overflow-hidden">
                    <span className="text-[7.5px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                      Date Target Venue
                    </span>
                    <h4 className="text-[11px] font-black text-white font-outfit truncate mt-0.5">{dateRestaurant.name}</h4>
                    <p className="text-[9px] text-pink-300 font-bold truncate leading-none mt-0.5">{dateRestaurant.specials.split(' (')[0]}</p>
                  </div>
                </div>
                
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setShowDateFlow(false);
                    setDateRestaurant(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scrollable Core Workspace Panel */}
              <div className="flex-1 w-full my-3 overflow-y-auto no-scrollbar flex flex-col justify-center items-center">
                
                {/* STEP 1: INTRO EXPERIENCE */}
                {dateFlowStep === 'intro' && (
                  <div className="w-full max-w-[310px] space-y-4 text-center animate-slide-up flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-3xl shadow-lg shadow-pink-500/20 animate-pulse">
                      💖
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-pink-400 tracking-widest font-outfit uppercase">AI Date Matchmaker</span>
                      <h3 className="text-base font-extrabold text-white font-outfit leading-tight">Find Your Dining Partner</h3>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed max-w-xs">
                        Hi! I am your AI Matchmaking Assistant. Answer 5 quick flavor questions to match with 3 local foodie partners who love this spot!
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDateFlowStep('preference');
                        playAudioBeep(523.25, 0.1, 'sine');
                      }}
                      className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-450 hover:to-pink-550 text-white font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-pink-500/25 active:scale-95 transition-all cursor-pointer animate-glow-ring"
                    >
                      🔮 Start Matchmaker Quiz
                    </button>
                  </div>
                )}

                {/* STEP 1.5: GENDER PREFERENCE SELECTOR */}
                {dateFlowStep === 'preference' && (
                  <div className="w-full max-w-[310px] space-y-4 animate-slide-up text-left flex flex-col">
                    <div className="text-center space-y-1.5 leading-none shrink-0">
                      <span className="text-[8.5px] font-black text-pink-400 tracking-widest font-outfit uppercase">Step 1 of 2: Preferences</span>
                      <h3 className="text-xs font-black text-white font-outfit leading-tight mt-1">Choose Your Match Vibe</h3>
                      <p className="text-[9.5px] text-slate-400 leading-normal max-w-xs mx-auto mt-1 font-medium font-outfit">
                        Tell us who you are and who you want to hang out with to filter our 30+ premium local foodies!
                      </p>
                    </div>

                    <div className="space-y-1.5 py-1 shrink-0 max-h-[175px] overflow-y-auto no-scrollbar w-full pr-1">
                      {[
                        { label: "🙋‍♂️ Male looking for Female dating", val: "M4F" },
                        { label: "🙋‍♀️ Female looking for Male dating", val: "F4M" },
                        { label: "🙋‍♂️ Male looking for Male dating", val: "M4M" },
                        { label: "🙋‍♀️ Female looking for Female dating", val: "F4F" },
                        { label: "🤝 Male looking for Male buddies (Platonic)", val: "M4M_Buddies" },
                        { label: "🤝 Female looking for Female buddies (Platonic)", val: "F4F_Buddies" },
                        { label: "🧑 Group / Platonic Hangout (Both)", val: "Group" }
                      ].map((pref) => {
                        const isSelected = matchmakerPreference === pref.val;
                        return (
                          <button
                            key={pref.val}
                            onClick={() => {
                              setMatchmakerPreference(pref.val);
                              playAudioBeep(330, 0.05, 'sine');
                            }}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-[9.5px] font-bold font-outfit transition-all duration-300 cursor-pointer flex justify-between items-center ${
                              isSelected
                                ? 'bg-pink-500/10 border-pink-500 text-pink-400 shadow-md shadow-pink-500/10 scale-[1.01]'
                                : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-350'
                            }`}
                          >
                            <span>{pref.label}</span>
                            {isSelected && <span className="text-pink-400 font-extrabold">✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        setDateFlowStep('quiz');
                        setDateQuizQuestionIndex(0);
                        setDateQuizAnswers({});
                        playAudioBeep(523.25, 0.1, 'sine');
                      }}
                      className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-450 hover:to-pink-550 text-white font-black py-3 rounded-2xl text-[10.5px] flex items-center justify-center gap-1.5 shadow-lg shadow-pink-500/25 active:scale-95 transition-all cursor-pointer uppercase tracking-wider font-mono shrink-0"
                    >
                      Continue to Flavor Quiz ➡️
                    </button>
                  </div>
                )}

                {/* STEP 2: 5-QUESTION QUIZ */}
                {dateFlowStep === 'quiz' && (
                  <div className="w-full max-w-[310px] space-y-4 animate-slide-up text-left flex flex-col">
                    {/* Progress HUD */}
                    <div className="flex justify-between items-center bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-full shrink-0">
                      <span className="text-[8px] font-black text-pink-400 tracking-widest font-outfit uppercase">AI Helper Active</span>
                      <span className="text-[9px] font-mono text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded-full">
                        Question {dateQuizQuestionIndex + 1} of 5
                      </span>
                    </div>

                    {/* Chat Bubble from AI Assistant */}
                    <div className="flex items-start gap-2.5 text-left animate-bubble-slide">
                      <div className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-base shrink-0 select-none shadow-md">
                        🤖
                      </div>
                      <div className="bg-slate-900 border border-slate-850 p-3 rounded-2xl rounded-tl-none shadow-md max-w-[240px]">
                        <p className="text-[11px] text-slate-200 font-semibold leading-relaxed font-outfit">
                          {dateQuestions[dateQuizQuestionIndex].q}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Clickable Option Buttons Stack */}
                    <div className="flex flex-col gap-2 shrink-0 w-full">
                      {dateQuestions[dateQuizQuestionIndex].options.map((opt, oIdx) => (
                        <button
                          key={opt.val}
                          onClick={() => handleAnswerQuestion(opt.val)}
                          className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-pink-500/50 p-3 rounded-2xl text-[10.5px] text-slate-300 font-bold font-outfit transition-all duration-200 hover:text-white flex items-center justify-between group cursor-pointer active:scale-[0.99]"
                        >
                          <span>{opt.label}</span>
                          <span className="w-4.5 h-4.5 rounded-full bg-slate-950/65 flex items-center justify-center text-[7px] text-slate-500 group-hover:text-pink-400 border border-slate-800 transition-colors">
                            {oIdx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 3: SCANNING PULSE SCREEN */}
                {dateFlowStep === 'scanning' && (
                  <div className="w-full max-w-[310px] flex flex-col items-center justify-center gap-4 text-center animate-fade-in shrink-0">
                    <div className="w-20 h-20 rounded-full border-4 border-pink-500/20 border-t-pink-500 flex items-center justify-center text-3xl animate-spin shadow-lg shadow-pink-500/20">
                      🌀
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9.5px] text-pink-400 font-extrabold tracking-widest uppercase animate-pulse">Running AI Recommender...</span>
                      <p className="text-[10px] text-slate-500 font-mono">sorting neighborhood matches nearby...</p>
                    </div>
                  </div>
                )}

                {/* STEP 4: TOP 3 MATCHES & INTERACTIVE CALENDAR */}
                {dateFlowStep === 'matches' && (
                  <div className="w-full max-w-[320px] flex flex-col gap-3 animate-slide-up shrink-0 text-center">
                    
                    {/* Header */}
                    <div className="shrink-0 leading-none">
                      <span className="text-[8.5px] font-black text-pink-400 tracking-wider uppercase">Select a Match Candidate</span>
                      <h4 className="text-xs font-black text-white font-outfit mt-1">3 Culinary Dates Matched!</h4>
                    </div>

                    {/* Candidate horizontal row */}
                    <div className="flex gap-2 py-0.5 overflow-x-auto no-scrollbar shrink-0 select-none justify-center">
                      {dateMatchedCandidates.map((candidate) => {
                        const isSelected = dateSelectedMatch?.name === candidate.name;
                        return (
                          <div
                            key={candidate.name}
                            onClick={() => {
                              setDateSelectedMatch(candidate);
                              playAudioBeep(350, 0.05, 'sine');
                            }}
                            className={`w-[96px] shrink-0 p-2.5 rounded-2xl border text-center relative transition-all duration-300 cursor-pointer active:scale-95 ${
                              isSelected 
                                ? 'bg-pink-500/10 border-pink-500 text-pink-400 shadow-md shadow-pink-500/10 scale-105'
                                : 'bg-slate-900/60 border-slate-800/80 text-slate-500 hover:bg-slate-900'
                            }`}
                          >
                            {/* Score Tag */}
                            <span className="absolute -top-1.5 -right-1 bg-rose-600 text-white font-extrabold text-[7.5px] px-1 rounded-full border border-slate-900 select-none">
                              {candidate.compatibility}%
                            </span>
                            
                            {/* Picture Bezel - fully visible, real portrait */}
                            <div className="w-9 h-9 rounded-full bg-slate-950 border border-pink-500/35 flex items-center justify-center mx-auto shadow-sm select-none relative overflow-hidden animate-glow-ring">
                              <img src={candidate.image} alt={candidate.name} className="w-full h-full object-cover select-none" />
                            </div>
                            
                            <h5 className="text-[10px] font-black font-outfit mt-1.5 truncate leading-none text-slate-200">{candidate.name}</h5>
                            <span className="text-[7.5px] text-slate-500 font-bold block truncate mt-0.5 uppercase">{candidate.neighborhood}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Locked details HUD indicator */}
                    <div className="bg-slate-950/60 border border-slate-850 p-2.5 rounded-2xl text-center shadow-md shrink-0">
                      <span className="text-[8px] text-pink-400 font-black uppercase tracking-wider block animate-pulse">🔒 profile details locked 🔒</span>
                      <p className="text-[9.5px] text-slate-400 leading-snug mt-1 max-w-[270px] mx-auto font-medium font-outfit">
                        Select a candidate above, then **pick a date on the calendar below** to reveal their full profile and treat them!
                      </p>
                    </div>

                    {/* Glassmorphic Mini-Calendar grid of May/June 2026 */}
                    <div className="bg-slate-900/90 border border-slate-850 p-3 rounded-3xl flex flex-col gap-2 shadow-inner shrink-0">
                      <div className="flex justify-between items-center leading-none">
                        <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-widest font-outfit">Interactive Calendar</span>
                        <span className="text-[9px] font-bold text-pink-400 font-outfit bg-pink-500/10 px-2 py-0.5 rounded-full">May / June 2026</span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: "Tue, May 26", full: "Tuesday, May 26, 2026" },
                          { label: "Wed, May 27", full: "Wednesday, May 27, 2026" },
                          { label: "Thu, May 28", full: "Thursday, May 28, 2026" },
                          { label: "Fri, May 29", full: "Friday, May 29, 2026" },
                          { label: "Sat, May 30", full: "Saturday, May 30, 2026" },
                          { label: "Sun, May 31", full: "Sunday, May 31, 2026" },
                          { label: "Mon, Jun 1", full: "Monday, June 1, 2026" },
                          { label: "Tue, Jun 2", full: "Tuesday, June 2, 2026" },
                          { label: "Wed, Jun 3", full: "Wednesday, June 3, 2026" },
                          { label: "Thu, Jun 4", full: "Thursday, June 4, 2026" },
                          { label: "Fri, Jun 5", full: "Friday, June 5, 2026" },
                          { label: "Sat, Jun 6", full: "Saturday, June 6, 2026" }
                        ].map((d) => (
                          <button
                            key={d.label}
                            onClick={() => handleSelectCalendarDate(d.full)}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-pink-500/40 py-1.5 px-1 rounded-xl text-[8.5px] font-black text-slate-400 font-outfit transition-all hover:text-white cursor-pointer active:scale-90"
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* STEP 5: PROFILE REVEALED & SPONSORED DATE PASS TICKET */}
                {dateFlowStep === 'revealed' && dateSelectedMatch && (
                  <div className="w-full max-w-[325px] flex flex-col gap-3 animate-slide-up shrink-0 text-center">
                    
                    {/* Unblurred Profile details card */}
                    <div className="bg-slate-950/80 border border-pink-500/35 p-3 rounded-3xl flex gap-3 text-left relative overflow-hidden shadow-xl shrink-0">
                      <div className="absolute top-0 right-0 bg-pink-500 text-white font-extrabold text-[7.5px] px-2 py-0.5 rounded-bl-lg tracking-widest uppercase animate-pulse select-none">
                        🔓 PROFILE UNLOCKED!
                      </div>
                      
                      {/* Fully unblurred profile photo */}
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 overflow-hidden shrink-0 animate-glow-ring select-none shadow-md">
                        <img src={dateSelectedMatch.image} alt={dateSelectedMatch.name} className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex-1 overflow-hidden space-y-0.5 leading-none">
                        <h4 className="text-xs font-black text-white font-outfit leading-none">{dateSelectedMatch.name}, {dateSelectedMatch.age}</h4>
                        <span className="inline-block text-[8px] text-pink-400 font-black tracking-wide mt-1 uppercase">
                          📍 {dateSelectedMatch.neighborhood} • Loves {dateSelectedMatch.favoriteFood}
                        </span>
                        <p className="text-[9.5px] text-slate-300 italic font-medium leading-relaxed mt-1 font-outfit">
                          "{dateSelectedMatch.bio}"
                        </p>
                      </div>
                    </div>

                    {/* Dynamic Heart Matching linking indicator */}
                    <div className="flex items-center justify-center gap-1.5 select-none shrink-0 leading-none">
                      <span className="text-[9px] text-slate-500 font-black uppercase font-outfit">Your Account</span>
                      <div className="flex-1 border-t border-dashed border-pink-500/50 flex items-center justify-center">
                        <span className="bg-pink-500/10 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded-full text-[8.5px] font-black font-outfit mx-1 leading-none select-none animate-pulse">
                          💖 Meetup Linked 📅
                        </span>
                      </div>
                      <span className="text-[9px] text-pink-400 font-black uppercase font-outfit">{dateSelectedMatch.name}</span>
                    </div>

                    {/* PHYSICAL CONCERT-STYLE SPONSORED DATE PASS TICKET */}
                    <div className="ticket-pass rounded-2xl p-4.5 relative overflow-hidden shadow-2xl flex flex-col gap-2 border-slate-800 text-left shrink-0">
                      {/* Visual cutouts on both left and right sides */}
                      <div className="ticket-tear-left"></div>
                      <div className="ticket-tear-right"></div>
                      
                      {/* Header Pass */}
                      <div className="flex justify-between items-center border-b border-pink-500/30 pb-2 mb-1 leading-none shrink-0 select-none">
                        <span className="text-[9.5px] font-black text-pink-400 tracking-widest font-mono uppercase">SPONSORED PASS</span>
                        <span className="text-[8px] bg-pink-500 text-white font-extrabold px-1.5 py-0.5 rounded leading-none select-none uppercase tracking-wide">
                          🎟️ treat
                        </span>
                      </div>

                      {/* Ticket stats rows */}
                      <div className="space-y-1.5 font-mono text-[9px] text-slate-300 leading-snug">
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase tracking-wide">Foodie Host:</span>
                          <span className="text-white font-bold uppercase">You (👤 Foodie)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase tracking-wide">Foodie Guest:</span>
                          <span className="text-white font-bold uppercase">{dateSelectedMatch.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase tracking-wide">Date Location:</span>
                          <span className="text-pink-400 font-bold truncate max-w-[140px] text-right uppercase">{dateRestaurant.name} 📍</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 uppercase tracking-wide">Date Time:</span>
                          <span className="text-amber-400 font-bold truncate max-w-[150px] text-right uppercase">{datePickedCalendarDate}</span>
                        </div>
                      </div>

                      {/* Dashed separator & treat banner */}
                      <div className="border-t border-dashed border-pink-500/35 pt-2.5 mt-1 text-center leading-none shrink-0">
                        <span className="text-[10px] font-extrabold text-pink-300 uppercase tracking-wider font-mono">
                          🎟️ FULLY SPONSORED BY HOST 🎟️
                        </span>
                        <span className="block text-[7px] text-slate-500 font-mono tracking-normal mt-1 leading-none">
                          Show this pass to your server to validate the sponsored deal
                        </span>
                      </div>
                    </div>

                    {/* Add to Calendar Section */}
                    <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl flex flex-col gap-1.5 shrink-0 text-left">
                      <div className="flex justify-between items-center leading-none">
                        <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">📅 Calendar Integration</span>
                        {isGuestJoined ? (
                          <span className="text-[7.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black tracking-wider uppercase animate-pulse">
                            ✓ Guest Joined & Synced!
                          </span>
                        ) : (
                          <span className="text-[7.5px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                            Invite Pending Sync
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-0.5">
                        <button 
                          onClick={() => {
                            setDatePassAddedToCalendar(true);
                            playLockChime(0);
                            setTimeout(() => playLockChime(2), 120);
                            triggerToast("📅 Real Google Calendar synced! Partner notified.");
                            handleAddGoogleCalendar();
                          }}
                          className={`text-[9px] font-black py-2 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer border uppercase tracking-wider ${
                            datePassAddedToCalendar
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-pink-500/30 text-slate-300'
                          }`}
                        >
                          📅 Add to Google
                        </button>
                        <button 
                          onClick={() => {
                            setDatePassAddedToCalendar(true);
                            playLockChime(0);
                            setTimeout(() => playLockChime(2), 120);
                            triggerToast("📅 Apple Calendar (.ics) downloaded! Partner notified.");
                            handleAddAppleCalendar();
                          }}
                          className={`text-[9px] font-black py-2 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer border uppercase tracking-wider ${
                            datePassAddedToCalendar
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-pink-500/30 text-slate-300'
                          }`}
                        >
                          📅 Add to Apple
                        </button>
                      </div>
                    </div>

                    {/* Viral actions button stack */}
                    <div className="grid grid-cols-2 gap-2 mt-0.5 shrink-0">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(dateInviteText);
                          triggerToast("🎟️ Ticket Invite Copied to Clipboard!");
                        }}
                        className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-450 hover:to-rose-550 text-white text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-lg shadow-pink-500/10 uppercase tracking-wide"
                      >
                        🎟️ Copy Invite
                      </button>
                      <button 
                        onClick={handleStartSimulatedChat}
                        className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer uppercase tracking-wide"
                      >
                        💬 Chat & Confirm
                      </button>
                    </div>

                    {/* Export Date Pass Ticket stub Button */}
                    <button 
                      onClick={() => {
                        playAudioBeep(523.25, 0.1, 'sine');
                        setShowDatePassModal(true);
                      }}
                      className="w-full mt-2 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-extrabold rounded-xl text-[10px] flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-[0.98] uppercase tracking-wider shadow-indigo-500/10 border border-indigo-500/30 shrink-0"
                    >
                      📸 Export Ticket stub to Gallery
                    </button>

                  </div>
                )/*



                {/* STEP 6: SIMULATED LIVE CHAT WINDOW */}
                {dateFlowStep === 'chat' && dateSelectedMatch && (
                  <div className="w-full max-w-[320px] h-[330px] flex flex-col bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative shrink-0">
                    
                    {/* Chat Header */}
                    <div className="bg-slate-900 border-b border-slate-850 p-2.5 flex items-center justify-between text-left shrink-0">
                      <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                        <div className="w-7 h-7 rounded-full bg-slate-950 border border-slate-800 overflow-hidden shrink-0 select-none">
                          <img src={dateSelectedMatch.image} alt={dateSelectedMatch.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="overflow-hidden leading-none space-y-0.5">
                          <h4 className="text-[11px] font-bold text-white font-outfit truncate">{dateSelectedMatch.name}</h4>
                          <span className="text-[7.5px] text-pink-400 font-extrabold tracking-wider uppercase leading-none block">Active dining partner</span>
                        </div>
                      </div>

                      {/* Video Chat Button Option */}
                      <button
                        onClick={handleInitiateVideoCall}
                        className="bg-slate-800 hover:bg-indigo-650 text-indigo-400 hover:text-white p-2 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 mr-1.5"
                        title="Start 4-Min Video Call ($3.00 Sponsor Charge)"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Chat Messages Log */}
                    <div className="flex-1 p-3 overflow-y-auto no-scrollbar space-y-3 text-left">
                      
                      {/* Proposed Date Approval Block */}
                      <div className={`p-3 rounded-2xl border mb-3 select-none flex flex-col gap-2 transition-all ${
                        isDateApprovedByBoth
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-900/90 border-slate-800 text-slate-200 shadow-lg'
                      }`}>
                        <div className="flex justify-between items-center shrink-0 leading-none">
                          <span className="text-[8px] font-black tracking-widest font-mono uppercase">
                            📅 DATE SPONSOR PROPOSAL
                          </span>
                          {isDateApprovedByBoth ? (
                            <span className="text-[7.5px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded leading-none select-none uppercase tracking-wide">
                              ✓ APPROVED
                            </span>
                          ) : (
                            <span className="text-[7.5px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                              PENDING CONFIRM
                            </span>
                          )}
                        </div>

                        {/* Summary stats */}
                        <div className="space-y-1 font-mono text-[8.5px] text-slate-300 leading-snug">
                          <div className="flex justify-between">
                            <span className="text-slate-500 uppercase">Target Venue:</span>
                            <span className="text-white font-bold uppercase">{dateRestaurant?.name} 📍</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 uppercase">Day & Time:</span>
                            <span className="text-amber-400 font-bold uppercase">{datePickedCalendarDate}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 uppercase">Sponsorship:</span>
                            <span className="text-pink-400 font-bold uppercase">Fully Sponsored (Host pays)</span>
                          </div>
                        </div>

                        {/* Button/Accept Action */}
                        {!isDateApprovedByBoth ? (
                          <button
                            onClick={() => {
                              setIsDateApprovedByBoth(true);
                              setIsGuestJoined(true); // Syncs calendar guest status
                              playLockChime(0);
                              setTimeout(() => playLockChime(2), 120);
                              triggerToast("🎉 Sponsored Date Confirmed & Approved by Both!");
                              
                              // Append response message in chat log
                              setChatMessages(prev => [
                                ...prev,
                                {
                                  sender: 'match',
                                  text: `Omg, date officially approved by both of us! 🥳 Locked in! I've accepted the ticket and synced it to my calendar. See you at ${dateRestaurant.name}! 💖`
                                }
                              ]);
                            }}
                            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-450 hover:to-rose-550 text-white text-[9px] font-black py-2 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-md uppercase tracking-wider animate-glow-ring"
                          >
                            👉 Click to Approve Date Together 👈
                          </button>
                        ) : (
                          <div className="text-center py-1.5 border-t border-dashed border-emerald-500/25 leading-tight">
                            <span className="text-[8px] text-emerald-400 font-black uppercase tracking-wider font-mono">
                              🎉 Confirmed & Locked! Both Calendars Synced!
                            </span>
                          </div>
                        )}
                      </div>

                      {chatMessages.map((msg, mIdx) => {
                        const isMe = msg.sender === 'you';
                        return (
                          <div 
                            key={mIdx}
                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-bubble-slide`}
                          >
                            <div className={`p-2.5 rounded-2xl max-w-[210px] text-[10px] font-semibold leading-relaxed font-outfit shadow-sm ${
                              isMe 
                                ? 'bg-indigo-650 text-white rounded-tr-none'
                                : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Typing indicator state */}
                      {isTypingChat && (
                        <div className="flex justify-start items-center gap-2 animate-bubble-slide">
                          <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl rounded-tl-none flex items-center gap-1">
                            <span className="text-[9.5px] text-slate-500 italic font-medium font-outfit pr-1">{dateSelectedMatch.name} is typing</span>
                            <div className="w-1 h-1 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1 h-1 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1 h-1 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chat Footer Close Button */}
                    <div className="p-2 bg-slate-900/60 border-t border-slate-850 shrink-0 text-center">
                      <button
                        onClick={() => {
                          setShowDateFlow(false);
                          setDateRestaurant(null);
                        }}
                        className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-bold py-2 rounded-xl text-[10px] cursor-pointer transition-all active:scale-95 shadow-lg shadow-indigo-600/10"
                      >
                        🎉 Close & Book Date Pass
                      </button>
                    </div>

                    {/* ================= OVERLAY 1: $3.00 VIDEO CHAT SWIPE PAYWALL ================= */}
                    {showVideoPaywall && (
                      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 animate-fade-in text-left select-none">
                        {/* Header */}
                        <div className="flex justify-between items-center shrink-0">
                          <span className="text-[8px] font-black text-indigo-400 tracking-widest font-outfit uppercase">Video Speed Call</span>
                          <button 
                            onClick={() => setShowVideoPaywall(false)}
                            className="text-slate-400 hover:text-white text-[9px] bg-slate-850 px-2 py-1 rounded-full cursor-pointer transition-colors"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Center Visual */}
                        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-3 my-2">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-2xl shadow-xl shadow-indigo-500/20 animate-pulse">
                            📹
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-xs font-black text-white font-outfit leading-tight">4-Minute Speed Call</h3>
                            <p className="text-[9.5px] text-slate-400 leading-relaxed max-w-[210px]">
                              Connect face-to-face with <strong>{dateSelectedMatch?.name}</strong> to feel the chemistry spark before your date!
                            </p>
                          </div>

                          {/* Pricing Card */}
                          <div className="w-full bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col items-center max-w-[220px]">
                            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest font-mono">Billed to Sponsor</span>
                            <span className="text-2xl font-black text-white mt-0.5 font-outfit">$3.00</span>
                            <span className="text-[7px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-bold uppercase mt-1">
                              Secure Stripe Charge
                            </span>
                          </div>
                        </div>

                        {/* Swipe Component */}
                        <div className="space-y-1.5 shrink-0">
                          <div className="text-center text-[8px] font-black text-indigo-400 uppercase tracking-wider animate-bounce">
                            👇 Click handle to pay $3.00 & start call 👇
                          </div>
                          <div 
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-full h-11 relative flex items-center justify-center overflow-hidden cursor-pointer"
                            id="swipe-track"
                          >
                            <span className="text-[8.5px] font-black text-slate-600 tracking-widest font-outfit uppercase select-none pointer-events-none">
                              Swipe to Pay $3.00
                            </span>
                            
                            <div 
                              onClick={handleSimulatedSwipe}
                              className="absolute left-1 top-1 bottom-1 w-9 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-450 hover:to-rose-550 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all text-[10px] font-black text-white cursor-pointer select-none"
                            >
                              ➔
                            </div>
                          </div>
                          <div className="text-center text-[7px] text-slate-500 font-mono leading-none">
                            Billed securely to cards ending in 4242.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ================= OVERLAY 2: CONNECTING ROOM STATE ================= */}
                    {isVideoCallConnecting && (
                      <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col justify-center items-center p-4 animate-fade-in select-none text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center relative overflow-hidden">
                          <img src={dateSelectedMatch.image} alt={dateSelectedMatch.name} className="w-full h-full object-cover blur-[1.5px] opacity-60" />
                          <div className="absolute inset-0 border-2 border-indigo-400 rounded-full animate-ping" style={{ animationDuration: '1.5s' }}></div>
                          <div className="absolute text-xl z-10 animate-bounce">🔒</div>
                        </div>
                        
                        <div className="space-y-1 leading-tight">
                          <span className="text-[8px] font-black text-indigo-400 tracking-widest font-outfit uppercase animate-pulse">
                            Connecting Room
                          </span>
                          <h3 className="text-xs font-black text-white font-outfit leading-tight mt-0.5">Securing Video Handshake...</h3>
                          <p className="text-[9px] text-slate-400 max-w-[200px] leading-relaxed mt-1">
                            Establishing dynamic WebRTC speed call room and billing $3.00 dater pass securely to Stripe...
                          </p>
                        </div>
                        <div className="w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}

                    {/* ================= OVERLAY 3: SIMULATED ACTIVE VIDEO CALL ================= */}
                    {isVideoCallActive && (
                      <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col justify-between p-3.5 animate-fade-in select-none rounded-3xl">
                        {/* Full Screen Partner Video stream */}
                        <div className="absolute inset-0 z-10 overflow-hidden rounded-3xl">
                          <img 
                            src={dateSelectedMatch.image} 
                            alt={dateSelectedMatch.name} 
                            className="w-full h-full object-cover brightness-[0.7] scale-105 blur-[0.5px] animate-pulse"
                            style={{ animationDuration: '4s' }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
                        </div>

                        {/* Header */}
                        <div className="z-20 flex justify-between items-center text-left shrink-0">
                          <div className="flex gap-1.5 items-center overflow-hidden">
                            <div className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 overflow-hidden shrink-0">
                              <img src={dateSelectedMatch.image} alt={dateSelectedMatch.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="leading-none overflow-hidden max-w-[120px]">
                              <h4 className="text-[10px] font-black text-white font-outfit truncate">{dateSelectedMatch.name}</h4>
                              <span className="text-[7px] text-pink-400 font-extrabold tracking-widest uppercase mt-0.5 block truncate">
                                Speed Call
                              </span>
                            </div>
                          </div>
                          
                          {/* Countdown Timer */}
                          <div className="bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full text-red-400 text-[9px] font-black font-mono flex items-center gap-1 animate-pulse leading-none">
                            <span className="w-1 h-1 rounded-full bg-red-400"></span>
                            {Math.floor(videoCallTimer / 60)}:{String(videoCallTimer % 60).padStart(2, '0')}
                          </div>
                        </div>

                        {/* Speech Bubble */}
                        <div className="z-20 flex-1 flex flex-col justify-end pb-3 max-w-[240px] mx-auto text-center">
                          <div className="bg-black/50 backdrop-blur-md border border-white/5 p-3 rounded-2xl space-y-0.5">
                            <span className="text-[7.5px] font-extrabold text-indigo-400 tracking-wider font-mono uppercase">
                              Status: Connected
                            </span>
                            <p className="text-[9.5px] text-slate-200 leading-relaxed font-medium">
                              "Wow, this is so cool that we can video chat before meeting at {dateRestaurant.name}! You look great!"
                            </p>
                          </div>
                        </div>

                        {/* Pip self view and control tools */}
                        <div className="z-20 flex justify-between items-center gap-3 shrink-0">
                          {/* Pip self preview */}
                          <div className="w-12 h-18 bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-lg shrink-0 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/20"></div>
                            <span className="text-[7px] font-extrabold text-slate-400 absolute bottom-0.5 left-0 right-0 text-center select-none">
                              You
                            </span>
                            <div className="text-sm">👤</div>
                          </div>

                          {/* Controls */}
                          <div className="flex gap-2 justify-center items-center flex-1 pr-1">
                            <button className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-2 rounded-full cursor-pointer transition-colors active:scale-90 border border-slate-700 text-[10px]">
                              🎙️
                            </button>
                            <button className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 p-2 rounded-full cursor-pointer transition-colors active:scale-90 border border-slate-700 text-[10px]">
                              📹
                            </button>
                            <button 
                              onClick={() => {
                                playAudioBeep(330, 0.25, 'sawtooth');
                                setVideoCallTimerActive(false);
                                isVideoCallActive(false);
                                setVideoCallRatingActive(true);
                              }}
                              className="bg-red-600 hover:bg-red-550 text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-90 shadow-lg shadow-red-600/35 border border-red-500 animate-glow-ring text-[10px]"
                              title="Hang Up Call"
                            >
                              📞
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ================= OVERLAY 4: CHEMISTRY VERDICT RATING ================= */}
                    {videoCallRatingActive && (
                      <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col justify-between p-4 animate-fade-in select-none text-left rounded-3xl">
                        <div className="shrink-0 text-center">
                          <span className="text-[8px] font-black text-pink-400 tracking-widest font-outfit uppercase">Call Finished</span>
                          <h3 className="text-xs font-black text-white font-outfit leading-tight mt-0.5">Chemistry Verdict</h3>
                        </div>

                        {/* Center rating content */}
                        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 my-2">
                          <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 overflow-hidden shrink-0 select-none">
                            <img src={dateSelectedMatch.image} alt={dateSelectedMatch.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[10px] font-black text-white font-outfit">Did you feel a chemistry spark?</h4>
                            <p className="text-[9px] text-slate-400 leading-snug max-w-[200px]">
                              Let us know if you felt a spark during your speed call with <strong>{dateSelectedMatch.name}</strong>.
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="w-full space-y-1.5 max-w-[190px]">
                            <button 
                              onClick={() => {
                                playJackpotFanfare();
                                setVideoCallRatingActive(false);
                                triggerToast("✨ High Chemistry Spark Confirmed! Gold star locked in!");
                                
                                // Append success verdict in chat
                                setChatMessages(prev => [
                                  ...prev,
                                  { 
                                    sender: 'you', 
                                    text: "✨ I had an amazing time on our speed video call! The spark is definitely there!" 
                                  },
                                  {
                                    sender: 'match',
                                    text: `OMG! Me too!! 💖 You fully deserve that gold star. Counting down the seconds until our date! See you at ${dateRestaurant.name}! 🎟️`
                                  }
                                ]);
                              }}
                              className="w-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 hover:from-pink-450 hover:to-pink-550 text-white font-black py-2.5 rounded-2xl text-[9px] flex items-center justify-center gap-1 shadow-lg shadow-pink-500/20 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                            >
                              ✨ Yes, Spark Felt!
                            </button>
                            <button 
                              onClick={() => {
                                playAudioBeep(440, 0.08, 'sine');
                                setVideoCallRatingActive(false);
                                triggerToast("🤝 Friend connection saved! Date ticket remains active.");
                                
                                // Append casual verdict in chat
                                setChatMessages(prev => [
                                  ...prev,
                                  { 
                                    sender: 'you', 
                                    text: "Thanks for the video call! Looking forward to grabbing our sponsored specials as friends!" 
                                  },
                                  {
                                    sender: 'match',
                                    text: "Absolutely! Friends date is going to be so high-vibe. See you there!"
                                  }
                                ]);
                              }}
                              className="w-full bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold py-2.5 rounded-2xl text-[9px] flex items-center justify-center active:scale-95 transition-all cursor-pointer border border-slate-700 uppercase tracking-wider"
                            >
                              🤝 Just friends / Next time
                            </button>
                          </div>
                        </div>

                        <div className="shrink-0 text-center text-[7px] text-slate-500 font-mono leading-none">
                          Your rating remains private unless you both feel a spark.
                        </div>
                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>
          )}\n\n        </div>

      </div>

    </div>
  );
}

export default App;
