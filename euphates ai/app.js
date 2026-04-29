import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Search, Map as MapIcon, Globe, Info, TreeDeciduous, Building2, Droplets, Layout, ChevronRight, Loader2, Locate, History, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Constants ---
const KOLKATA_CENTER = { lat: 22.5726, lng: 88.3639 };
const API_BASE = `http://${window.location.hostname}:8000/api`;

const GREEN_ZONES = [
  { name: 'Maidan', lat: 22.553, lng: 88.347, radius: 0.015 },
  { name: 'Eco Park', lat: 22.595, lng: 88.465, radius: 0.02 },
  { name: 'Botanical Garden', lat: 22.560, lng: 88.286, radius: 0.015 },
  { name: 'Rabindra Sarobar', lat: 22.511, lng: 88.361, radius: 0.01 },
  { name: 'Central Park', lat: 22.586, lng: 88.419, radius: 0.01 }
];
const WATER_ZONES = [
  { name: 'Hooghly River', lat: 22.57, lng: 88.33, weight: 0.01 },
  { name: 'East Kolkata Wetlands', lat: 22.55, lng: 88.45, weight: 0.03 }
];

// --- Utilities ---
const getDistance = (lat1, lng1, lat2, lng2) => Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));

const analyzeArea = (lat, lng) => {
  let vegScore = 0.15;
  GREEN_ZONES.forEach(zone => {
    const dist = getDistance(lat, lng, zone.lat, zone.lng);
    if (dist < zone.radius) vegScore += (zone.radius - dist) * 40;
  });
  
  let landType = 'Urban';
  let waterInfluence = 0;
  WATER_ZONES.forEach(zone => {
    const dist = getDistance(lat, lng, zone.lat, zone.lng);
    if (dist < zone.weight) waterInfluence = Math.max(waterInfluence, (zone.weight - dist) / zone.weight);
  });

  if (waterInfluence > 0.6) landType = 'Water';
  else if (vegScore > 0.6) landType = 'Green';
  else if (vegScore > 0.3 || waterInfluence > 0.2) landType = 'Mixed';

  let openSpace = 'Low';
  if (vegScore > 0.5 || waterInfluence > 0.4) openSpace = 'High';
  else if (vegScore > 0.25) openSpace = 'Medium';

  return {
    vegetation: vegScore > 0.6 ? 'High' : (vegScore > 0.3 ? 'Medium' : 'Low'),
    vegetationValue: Math.min(Math.max(vegScore * 100, 10), 95),
    landType,
    openSpace
  };
};

// --- Components ---

const HistorySidebar = ({ history, onSelect, onClose, onClear }) => (
  <motion.div 
    initial={{ x: -400 }}
    animate={{ x: 0 }}
    exit={{ x: -400 }}
    className="fixed top-0 left-0 h-full w-80 glass z-[100] p-6 shadow-2xl flex flex-col"
  >
    <div className="flex justify-between items-center mb-8">
      <h2 className="text-xl font-bold font-display flex items-center gap-2">
        <History className="w-5 h-5 text-apple-blue" /> Memory
      </h2>
      <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
      {history.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <History className="w-10 h-10 mx-auto mb-4" />
          <p className="text-sm">No analysis history yet.</p>
        </div>
      ) : (
        history.map((item) => (
          <button 
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full text-left p-4 rounded-2xl bg-white/50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-apple-blue/20 group"
          >
            <p className="text-sm font-bold truncate">{item.name}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-gray-400 font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${item.vegetation === 'High' ? 'bg-green-50 text-apple-green' : 'bg-red-50 text-apple-red'}`}>
                {item.vegetation} VEG
              </span>
            </div>
          </button>
        ))
      )}
    </div>

    {history.length > 0 && (
      <button 
        onClick={onClear}
        className="mt-6 w-full py-3 flex items-center justify-center gap-2 text-apple-red font-bold text-xs hover:bg-red-50 rounded-2xl transition-colors"
      >
        <Trash2 className="w-4 h-4" /> Clear Memory
      </button>
    )}
  </motion.div>
);

const DetailedReportModal = ({ content, onClose, loading }) => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (showChat) scrollToBottom();
  }, [chatHistory, showChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || isSending) return;

    const userMsg = { role: 'user', content: chatMessage };
    setChatHistory(prev => [...prev, userMsg]);
    setChatMessage('');
    setIsSending(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: content,
          message: chatMessage,
          history: chatHistory
        })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I lost my connection. Please try again." }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 md:p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[2rem] w-full max-w-4xl h-[90vh] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] flex flex-col border border-white/20"
      >
        {/* Header */}
        <div className="p-6 md:px-10 md:py-8 border-b border-gray-100 flex justify-between items-start bg-gradient-to-r from-apple-gray to-white shrink-0">
          <div>
            <h2 className="text-3xl font-bold font-display tracking-tight text-apple-dark">Ecological Insights</h2>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-apple-green rounded-full animate-pulse"></div>
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">Neighborhood Analysis</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowChat(!showChat)}
              className={`p-3 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold ${showChat ? 'bg-apple-blue text-white' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}
            >
              {showChat ? 'View Report' : 'Ask Question'}
            </button>
            <button onClick={onClose} className="p-3 hover:bg-apple-gray rounded-2xl transition-all">
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col relative">
          <AnimatePresence mode="wait">
            {!showChat ? (
              <motion.div 
                key="report"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0 overflow-y-auto p-6 md:p-10"
              >
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-apple-blue/10 border-t-apple-blue rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-apple-blue">
                        <Droplets className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold font-display text-apple-dark">Synthesizing Data...</p>
                      <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">Analyzing climate patterns and neighborhood ecology</p>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="prose prose-sm md:prose-base max-w-none prose-headings:font-display prose-headings:text-apple-dark prose-p:text-gray-600 prose-strong:text-apple-dark prose-ul:list-disc prose-li:marker:text-apple-blue space-y-4"
                    dangerouslySetInnerHTML={{ __html: marked.parse(content) }}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute inset-0 flex flex-col bg-apple-gray/30"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100">
                        <Info className="w-8 h-8 text-apple-blue" />
                      </div>
                      <p className="text-sm font-bold text-apple-dark">What would you like to know?</p>
                      <p className="text-xs text-gray-400 mt-1">Ask about the recommended trees, cooling tips, or biodiversity.</p>
                    </div>
                  )}
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className={`max-w-[85%] p-4 md:p-5 rounded-[1.5rem] ${
                        msg.role === 'user' 
                          ? 'bg-apple-dark text-white shadow-lg rounded-tr-none' 
                          : 'bg-white shadow-sm border border-gray-100 rounded-tl-none'
                      }`}>
                        <div 
                          className={`text-sm md:text-base leading-relaxed ${
                            msg.role === 'user' ? 'font-medium' : 'prose prose-sm max-w-none text-gray-700 font-sans'
                          }`}
                          dangerouslySetInnerHTML={msg.role === 'assistant' ? { __html: marked.parse(msg.content) } : null}
                        >
                          {msg.role === 'user' ? msg.content : null}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
                        <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce"></span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                
                <form onSubmit={handleSend} className="p-6 bg-white border-t border-gray-100 flex gap-3">
                  <input 
                    type="text" 
                    placeholder="Ask a follow-up question..." 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1 bg-apple-gray/50 border-none px-5 py-4 rounded-2xl text-sm focus:ring-2 focus:ring-apple-blue/20 transition-all"
                  />
                  <button 
                    disabled={isSending}
                    className="p-4 bg-apple-blue text-white rounded-2xl hover:bg-blue-600 transition-colors shadow-lg disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 md:px-10 md:py-8 bg-apple-gray/50 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <p className="text-[10px] text-gray-400 font-medium max-w-[300px] text-center md:text-left">
            {!showChat ? 'Environmental heuristics based on local Kolkata climate data.' : 'Talking with your personalized ecological assistant.'}
          </p>
          <div className="flex gap-3 w-full md:w-auto">
            {!showChat && (
              <button 
                onClick={() => setShowChat(true)}
                className="flex-1 md:flex-none px-8 py-4 bg-white border border-gray-200 text-apple-dark rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all"
              >
                Discuss Report
              </button>
            )}
            <button 
              onClick={onClose}
              className="flex-1 md:flex-none px-10 py-4 bg-apple-dark text-white rounded-2xl text-sm font-bold hover:bg-black transition-all shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AnalysisCard = ({ location, data, loading, onReport }) => {
  if (loading) return (
    <div className="glass p-8 rounded-3xl w-full md:w-80 flex flex-col items-center justify-center space-y-4 shadow-2xl">
      <div className="w-10 h-10 border-4 border-apple-blue/10 border-t-apple-blue rounded-full animate-spin"></div>
      <p className="text-sm font-medium text-gray-500">Analyzing neighborhood...</p>
    </div>
  );

  if (!data) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 rounded-[2rem] w-full md:w-80 space-y-5 shadow-2xl pointer-events-auto border border-white/40"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Analysis Result</h3>
          <h2 className="text-lg md:text-xl font-bold font-display leading-tight">{location.name}</h2>
          <p className="text-[10px] text-gray-400 font-mono">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${data.vegetation === 'High' ? 'text-apple-green bg-green-50' : 'text-apple-red bg-red-50'}`}>
          {data.vegetation} VEG
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[11px] font-bold">
            <span className="flex items-center gap-1.5"><TreeDeciduous className="w-3.5 h-3.5 text-apple-green" /> Vegetation</span>
            <span>{Math.round(data.vegetationValue)}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${data.vegetationValue}%` }}
              className={`h-full rounded-full transition-all duration-1000 ${data.vegetationValue > 60 ? 'bg-apple-green' : (data.vegetationValue > 30 ? 'bg-apple-yellow' : 'bg-apple-red')}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/50 p-3 rounded-2xl border border-white/50">
            <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">Land Type</p>
            <p className="text-sm font-bold truncate">{data.landType}</p>
          </div>
          <div className="bg-white/50 p-3 rounded-2xl border border-white/50">
            <p className="text-[9px] font-bold uppercase text-gray-400 mb-1">Open Space</p>
            <p className="text-sm font-bold truncate">{data.openSpace}</p>
          </div>
        </div>
      </div>

      <button 
        onClick={() => onReport(location, data)}
        className="w-full py-4 bg-apple-dark text-white rounded-[1.25rem] text-sm font-bold flex items-center justify-center gap-2 hover:bg-black transition-all hover:scale-[1.02] shadow-lg active:scale-95 group"
      >
        View Detailed Report <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
};

const App = () => {
  const [viewMode, setViewMode] = useState('2d');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState({ ...KOLKATA_CENTER, name: 'Kolkata Central' });
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const leafletMap = useRef(null);
  const cesiumViewer = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Initialize Maps & Fetch History
  useEffect(() => {
    initMaps();
    fetchHistory();
  }, []);

  const initMaps = () => {
    try {
      if (typeof L !== 'undefined' && !leafletMap.current) {
        leafletMap.current = L.map('leaflet-container', { 
          zoomControl: false, 
          attributionControl: false,
          wheelPxPerZoomLevel: 120, // Smoother scroll zoom
          wheelDebounceTime: 10,
          tap: true // Ensure touch tap is active
        }).setView([KOLKATA_CENTER.lat, KOLKATA_CENTER.lng], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(leafletMap.current);
      }
      if (typeof Cesium !== 'undefined' && !cesiumViewer.current) {
        // Suppress default access token warnings
        Cesium.Ion.defaultAccessToken = '';
        
        cesiumViewer.current = new Cesium.Viewer('cesium-container', { 
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          baseLayer: new Cesium.ImageryLayer(new Cesium.UrlTemplateImageryProvider({
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maximumLevel: 19
          })),
          animation: false, baseLayerPicker: false, fullscreenButton: false, geocoder: false, homeButton: false, infoBox: false, sceneModePicker: false, selectionIndicator: false, timeline: false, navigationHelpButton: false
        });

        // Improve 3D interaction feel
        const controller = cesiumViewer.current.scene.screenSpaceCameraController;
        controller.enableInertia = true;
        controller.inertiaSpin = 0.85;
        controller.inertiaTranslate = 0.85;
        controller.inertiaZoom = 0.7;
        controller.maximumZoomDistance = 20000;
        controller.minimumZoomDistance = 100;
        
        cesiumViewer.current.camera.flyTo({ 
          destination: Cesium.Cartesian3.fromDegrees(KOLKATA_CENTER.lng, KOLKATA_CENTER.lat - 0.03, 5000),
          orientation: {
            heading: 0.0,
            pitch: Cesium.Math.toRadians(-45.0),
            roll: 0.0
          }
        });
      }
    } catch (err) {
      console.error("Map init error:", err);
      setError("Failed to initialize maps.");
    }
  };


  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`);
      const data = await res.json();
      setHistory(data);
    } catch (e) { console.error("History fetch error:", e); }
  };

  const handleAnalysis = async (lat, lng, name) => {
    setIsLoading(true);
    setTimeout(async () => {
      const results = analyzeArea(lat, lng);
      setAnalysisData(results);
      updateOverlays(lat, lng, results);
      
      // Save to Backend
      try {
        await fetch(`${API_BASE}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, lat, lng, ...results })
        });
        fetchHistory();
      } catch (e) { console.error("Save error:", e); }
      
      setIsLoading(false);
    }, 800);
  };

  const updateOverlays = (lat, lng, data) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    
    const color = data.vegetation === 'High' ? '#34c759' : (data.vegetation === 'Medium' ? '#ffcc00' : '#ff3b30');
    
    // Update Leaflet
    if (leafletMap.current) {
      if (markerRef.current) markerRef.current.remove();
      if (circleRef.current) circleRef.current.remove();
      markerRef.current = L.marker([lat, lng]).addTo(leafletMap.current);
      circleRef.current = L.circle([lat, lng], { radius: 500, color, fillColor: color, fillOpacity: 0.2 }).addTo(leafletMap.current);
      leafletMap.current.flyTo([lat, lng], 15);
    }
    
    // Update Cesium
    if (cesiumViewer.current) {
      cesiumViewer.current.entities.removeAll();
      cesiumViewer.current.entities.add({ position: Cesium.Cartesian3.fromDegrees(lng, lat), point: { pixelSize: 10, color: Cesium.Color.fromCssColorString(color) } });
      cesiumViewer.current.entities.add({ position: Cesium.Cartesian3.fromDegrees(lng, lat), ellipse: { semiMinorAxis: 500.0, semiMajorAxis: 500.0, material: Cesium.Color.fromCssColorString(color).withAlpha(0.3) } });
      cesiumViewer.current.camera.flyTo({ 
        destination: Cesium.Cartesian3.fromDegrees(lng, lat - 0.015, 1500),
        orientation: {
          heading: 0.0,
          pitch: Cesium.Math.toRadians(-45.0),
          roll: 0.0
        }
      });
    }
  };
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ' Kolkata')}`);
      if (!res.ok) throw new Error("Search service failed");
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        if (isNaN(newLat) || isNaN(newLng)) throw new Error("Invalid response");
        const name = display_name.split(',')[0];
        setCurrentLocation({ lat: newLat, lng: newLng, name });
        handleAnalysis(newLat, newLng, name);
      } else {
        setError("Location not found in Kolkata.");
      }
    } catch (e) { 
      console.error("Search error:", e);
      setError("Search failed. Please try again.");
    } finally { 
      setIsLoading(false); 
    }
  };


  const handleClearHistory = async () => {
    await fetch(`${API_BASE}/history`, { method: 'DELETE' });
    fetchHistory();
  };

  const handleGenerateReport = async (location, data) => {
    setShowReport(true);
    setIsGeneratingReport(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, name: location.name, lat: location.lat, lng: location.lng })
      });
      
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      
      const result = await res.json();
      setReportContent(result.report);
    } catch (e) {
      console.error("Report error:", e);
      // SAFETY MODE FALLBACK
      const fallbackReport = `
# Neighborhood Report: ${location.name} (Safety Mode)
**Note: The AI synthesis is currently offline, but here is your local data analysis.**

### 🌳 Vegetation & Environment
The area has a **${data.vegetation}** vegetation level (${Math.round(data.vegetationValue)}%). This suggests a ${data.landType === 'Green' ? 'thriving natural' : 'densely urban'} environment.

### 🏠 Land & Open Space
- **Land Type:** ${data.landType}
- **Open Space:** ${data.openSpace}

### 🌱 Recommended Plants (Fast Growing)
1. **Subabul** (Leucaena leucocephala) - Extremely fast growth.
2. **Cassia Fistula** (Amaltas) - Beautiful yellow flowers, grows well in Kolkata.
3. **Neem** - Best for air purification.

*Please check your backend console for connection errors.*
      `;
      setReportContent(fallbackReport);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div id="leaflet-container" className={viewMode === '2d' ? 'map-visible' : 'map-hidden'}></div>
      <div id="cesium-container" className={viewMode === '3d' ? 'map-visible' : 'map-hidden'}></div>

      <div className="absolute top-0 left-0 w-full p-4 md:p-6 z-50 flex flex-col md:flex-row justify-between items-start gap-4 pointer-events-none">
        <div className="flex flex-col gap-3 md:gap-4 pointer-events-auto w-full md:w-auto">
          <div className="flex gap-2">
            <button 
              onClick={() => setShowHistory(true)}
              className="glass p-3 rounded-2xl hover:bg-white transition-colors shadow-lg"
            >
              <History className="w-5 h-5 text-apple-dark" />
            </button>
            <div className="glass px-4 py-2.5 md:px-5 md:py-3 rounded-2xl flex items-center gap-3 shadow-lg">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-apple-dark rounded-lg flex items-center justify-center">
                <span className="text-white font-display font-bold text-base md:text-lg">E</span>
              </div>
              <div>
                <h1 className="text-xs md:text-sm font-bold tracking-tight">EUPHRATES</h1>
                <p className="text-[9px] md:text-[10px] text-gray-400 font-medium uppercase tracking-tighter">AI Node</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative group w-full md:w-80">
            <input 
              type="text" 
              placeholder="Search location in Kolkata..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/90 backdrop-blur-xl border border-white/50 px-5 py-3.5 pl-11 rounded-[1.25rem] shadow-xl focus:outline-none focus:ring-4 focus:ring-apple-blue/10 transition-all text-sm font-medium"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </form>
        </div>

        <div className="flex flex-col items-end gap-4 pointer-events-auto hidden md:flex">
          <div className="glass p-1.5 rounded-[1.25rem] flex gap-1 shadow-lg">
            <button onClick={() => setViewMode('2d')} className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === '2d' ? 'bg-apple-dark text-white' : 'text-gray-500'}`}><MapIcon className="w-3.5 h-3.5" /> 2D</button>
            <button onClick={() => setViewMode('3d')} className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${viewMode === '3d' ? 'bg-apple-dark text-white' : 'text-gray-500'}`}><Globe className="w-3.5 h-3.5" /> 3D</button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 md:bottom-10 left-0 md:left-auto md:right-10 w-full md:w-auto p-4 md:p-0 z-50 pointer-events-none">
        <AnalysisCard 
          location={currentLocation} 
          data={analysisData} 
          loading={isLoading} 
          onReport={handleGenerateReport}
        />
      </div>

      <AnimatePresence>
        {showHistory && (
          <HistorySidebar 
            history={history} 
            onClose={() => setShowHistory(false)} 
            onClear={handleClearHistory}
            onSelect={(item) => {
              setCurrentLocation(item);
              setAnalysisData(item);
              updateOverlays(item.lat, item.lng, item);
              setShowHistory(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-apple-dark text-white px-6 py-3 rounded-full text-xs font-bold flex items-center gap-3 shadow-2xl">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> SYNCING...
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }} 
            className="absolute top-24 left-1/2 -translate-x-1/2 z-[70] bg-white text-apple-red px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-3 shadow-2xl border border-red-100"
          >
            <Info className="w-4 h-4" /> {error}
            <button onClick={() => setError(null)} className="ml-2 hover:bg-red-50 p-1 rounded-full"><X className="w-3 h-3" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && (
          <DetailedReportModal 
            content={reportContent} 
            loading={isGeneratingReport} 
            onClose={() => setShowReport(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

createRoot(document.getElementById('root')).render(<App />);
