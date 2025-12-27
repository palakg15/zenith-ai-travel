import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { useReactToPrint } from 'react-to-print';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Fix for Leaflet Marker Icons
import markerIconPng from "leaflet/dist/images/marker-icon.png";
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIconPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Component to handle Map Panning
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 12);
  }, [center, map]);
  return null;
}

function App() {
  // Navigation & Auth State
  const [currentPage, setCurrentPage] = useState('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);

  // Form & Plan State
  const [form, setForm] = useState({ destination: '', budget: '', days: '', nights: '' });
  const [plan, setPlan] = useState('');
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); 
  const [loading, setLoading] = useState(false);
  const [lastTrip, setLastTrip] = useState(localStorage.getItem('lastDest') || '');

  // Ref for PDF Export
  const contentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Zenith_Trip_${form.destination}`,
  });

  // --- Handlers ---

  const handleSendOTP = async () => {
    try {
      await axios.post('http://localhost:5001/api/send-otp', { email });
      setStep(2);
    } catch (e) { alert("Error sending code."); }
  };

  const handleVerifyOTP = async () => {
    try {
      const res = await axios.post('http://localhost:5001/api/verify-otp', { email, otp });
      if (res.data.status === "success") setCurrentPage('dashboard');
    } catch (e) { alert("Invalid Code"); }
  };

  const getPlan = async () => {
    if (!form.destination) return;
    setLoading(true);
    localStorage.setItem('lastDest', form.destination);
    setLastTrip(form.destination);
    
    try {
      // 1. Geocoding
      const geo = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${form.destination}`);
      if (geo.data.length > 0) {
        setMapCenter([parseFloat(geo.data[0].lat), parseFloat(geo.data[0].lon)]);
      }
      
      // 2. AI Plan Generation
      const res = await axios.post('http://localhost:5001/api/plan', form);
      setPlan(res.data.plan);
      setCurrentPage('plan');
    } catch (e) { 
      alert("AI Service Error. Check if your backend is running."); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- Views ---

  if (currentPage === 'login') {
    return (
      <div className="page">
        <div className="auth-card">
          <h1 className="logo-text">ZENITH</h1>
          <p className="tagline">PREMIUM AI TRAVEL INTELLIGENCE</p>
          <div className="auth-form">
            <input placeholder="Email Address" onChange={(e) => setEmail(e.target.value)} />
            {step === 2 && <input placeholder="6-Digit Code" onChange={(e) => setOtp(e.target.value)} />}
            <button className="btn-primary" onClick={step === 1 ? handleSendOTP : handleVerifyOTP}>
              {step === 1 ? "GET ACCESS CODE" : "VERIFY & START"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'dashboard') {
    return (
      <div className="page">
        <div className="auth-card" style={{ maxWidth: '500px' }}>
          <h1 className="logo-text" style={{ fontSize: '2.2rem' }}>PLAN TRIP</h1>
          <div className="auth-form">
            {lastTrip && <p style={{ color: 'var(--indigo)', fontSize: '0.7rem', letterSpacing: '1px' }}>RECENT: {lastTrip.toUpperCase()}</p>}
            <input placeholder="Destination (e.g. Goa)" onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            <input placeholder="Budget (INR)" type="number" onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input placeholder="Days" style={{ width: '50%' }} type="number" onChange={(e) => setForm({ ...form, days: e.target.value })} />
              <input placeholder="Nights" style={{ width: '50%' }} type="number" onChange={(e) => setForm({ ...form, nights: e.target.value })} />
            </div>
            <button className="btn-primary" onClick={getPlan} disabled={loading}>
              {loading ? "CURATING..." : "GENERATE ITINERARY"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Itinerary Result View ---
  return (
    <div className="page" style={{ overflowY: 'auto', display: 'block', padding: '40px 0' }}>
      <div className="auth-card" style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
        
        {/* TOP STATS BAR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '15px 25px', borderRadius: '15px', marginBottom: '25px', border: '1px solid var(--border)' }}>
          <div><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>DESTINATION</span><br /><strong>{form.destination.toUpperCase()}</strong></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>DURATION</span><br /><strong>{form.days}D / {form.nights}N</strong></div>
          <div><span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>BUDGET</span><br /><strong>₹{form.budget}</strong></div>
          <button onClick={() => setCurrentPage('dashboard')} style={{ background: 'none', border: '1px solid var(--indigo)', color: 'var(--indigo)', borderRadius: '8px', cursor: 'pointer', padding: '5px 15px' }}>EDIT</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '25px', height: '60vh' }}>
          
          {/* LEFT: ITINERARY TEXT */}
          <div ref={contentRef} className="itinerary-scroll-box" style={{ overflowY: 'auto', paddingRight: '15px' }}>
            <h3 style={{ color: 'white', marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Your Zenith Curated Journey</h3>
            {plan.split('\n').map((line, i) => {
              const isHeader = line.includes('###') || line.includes('DAY');
              return (
                <div key={i} style={{ 
                  marginBottom: isHeader ? '18px' : '8px',
                  marginTop: isHeader ? '20px' : '0',
                  color: isHeader ? 'var(--indigo)' : '#cbd5e1',
                  fontWeight: isHeader ? '800' : 'normal',
                  fontSize: isHeader ? '1.2rem' : '0.95rem',
                  lineHeight: '1.7'
                }}>
                  {line.replace(/###/g, '').replace(/\*\*/g, '')}
                </div>
              );
            })}
          </div>

          {/* RIGHT: MAP */}
          <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
            <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', filter: 'invert(90%) hue-rotate(180deg) brightness(95%)' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={mapCenter} />
              <MapUpdater center={mapCenter} />
            </MapContainer>
          </div>
        </div>

        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => handlePrint()}>EXPORT TO PDF</button>
          <button className="btn-primary" style={{ flex: 1, background: '#25D366' }} onClick={() => window.open(`https://wa.me/?text=Check out my Zenith Trip to ${form.destination}: ${encodeURIComponent(plan.substring(0, 300))}...`)}>SHARE ON WHATSAPP</button>
        </div>
      </div>
    </div>
  );
}

export default App;