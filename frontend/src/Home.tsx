import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, Send, Activity, Settings2, Eye, Brain, Paperclip, 
  Image as ImageIcon, FileText, MonitorUp, Volume2, VolumeX, 
  Search, Code, Zap, Database, CheckSquare, Sparkles, XCircle,
  ThumbsUp, ThumbsDown, Pin, Pencil, Trash2, Download, PlayCircle,
  Copy, Check, Loader2, AlertCircle, Info as InfoIcon, Heart
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { useConfig } from './hooks/useConfig';
import type { MIAConfig } from './types/config';

interface WaveformBarProps {
  level: number;
}

const WaveformBar: React.FC<WaveformBarProps> = ({ level }) => {
  const [randomFactor] = useState(() => 0.5 + Math.random());
  return (
    <div 
      className="w-[3px] bg-primary rounded-full transition-all duration-75"
      style={{ height: `${20 + (level * randomFactor)}%` }}
    ></div>
  );
};


const COMMANDS = [
  { cmd: '/search', desc: 'Real-time web search', icon: <Search size={16} /> },
  { cmd: '/code', desc: 'Write or execute code', icon: <Code size={16} /> },
  { cmd: '/vision', desc: 'Analyze image/screen', icon: <Eye size={16} /> },
  { cmd: '/memorize', desc: 'Save to long-term memory', icon: <Database size={16} /> },
  { cmd: '/aplikasi', desc: 'Jalankan aplikasi spesifik', icon: <Zap size={16} /> },
  { cmd: '/deep-research', desc: 'Deep dive multi-step research', icon: <Sparkles size={16} /> },
  { cmd: '/plan', desc: 'Create implementation plan', icon: <CheckSquare size={16} /> },
  { cmd: '/clear', desc: 'Clear chat history', icon: <XCircle size={16} /> },
];

interface Message {
  id?: number;
  role: string;
  content: string;
  timestamp?: string;
  is_pinned?: boolean;
  is_liked?: number;
  is_editing?: boolean;
  audio?: string;
}

interface Toast {
  id: number;
  msg: string;
  type: 'info' | 'success' | 'error';
}

export default function Home() {
  const location = useLocation();
  // --- 1. STATES ---
  const { config, loading: configLoading } = useConfig();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [brainStatus, setBrainStatus] = useState("Disconnected");
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isTTSMuted, setIsTTSMuted] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [memoryFiles, setMemoryFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [filteredCommands, setFilteredCommands] = useState(COMMANDS);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [mood] = useState("neutral"); 
  const [intimacyActive, setIntimacyActive] = useState(false);

  // --- 2. REFS ---
  const ws = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const audioQueue = useRef<string[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const playAudioRef = useRef<((src: string) => void) | null>(null);

  // --- 3. UTILITY CALLBACKS ---
  const addToast = useCallback((msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const playSFX = useCallback((type: 'send' | 'receive' | 'pop' | 'error') => {
    if (!audioContext.current) return;
    const ctx = audioContext.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (type === 'send') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    } else if (type === 'receive') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    } else if (type === 'pop') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    }
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  }, []);

  // --- 4. MEDIA & AUDIO LOGIC ---
  const stopAudio = useCallback(() => {
    if (currentAudio.current) { currentAudio.current.pause(); currentAudio.current.src = ""; }
    audioQueue.current = [];
    setIsSpeaking(false);
  }, []);

  const playAudio = useCallback((src: string) => {
    if (isSpeaking) { audioQueue.current.push(src); return; }
    const audio = new Audio(src);
    audio.crossOrigin = "anonymous";
    currentAudio.current = audio;
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 256;
    }
    const source = audioContext.current.createMediaElementSource(audio);
    source.connect(analyser.current!);
    analyser.current!.connect(audioContext.current.destination);
    const updateLevel = () => {
      if (!analyser.current) return;
      const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
      analyser.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average);
      animationFrame.current = requestAnimationFrame(updateLevel);
    };
    audio.onplay = () => {
      setIsSpeaking(true);
      if (audioContext.current?.state === 'suspended') audioContext.current.resume();
      updateLevel();
    };
    audio.onended = () => {
      setIsSpeaking(false); setAudioLevel(0);
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (audioQueue.current.length > 0) {
        const next = audioQueue.current.shift();
        if (next) playAudioRef.current?.(next);
      }
    };
    audio.onerror = () => {
      setIsSpeaking(false); setAudioLevel(0);
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
    audio.play().catch(() => console.log("Audio play blocked by browser policy"));
  }, [isSpeaking]);

  useEffect(() => { playAudioRef.current = playAudio; }, [playAudio]);

  // --- 5. SYSTEM & CHAT LOGIC ---
  const sendMessage = useCallback(() => {
    const trimmedInput = input.trim();
    if (!trimmedInput || !ws.current) return;

    if (trimmedInput === '/clear') {
       fetch('/api/chat/history', { method: 'DELETE' }); 
       setMessages([]); setInput("");
       addToast("Chat history cleared", "info");
       return;
    }

    // --- OPTIMISTIC UPDATE: Langsung tampilkan di layar ---
    const userMsg: Message = {
      id: Date.now(), // ID sementara untuk UI
      role: 'You',
      content: trimmedInput,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    
    setIsThinking(true); 
    playSFX('send');
    ws.current.send(trimmedInput);
    
    setInput(""); 
    setShowCommands(false); 
    setShowMentions(false); 
    setShowAttachMenu(false);
  }, [input, addToast, playSFX]);

  const toggleIntimacy = useCallback(async () => {
    try {
      const target = !intimacyActive;
      const res = await fetch(`/api/intimacy/toggle?active=${target}`, { method: 'POST' });
      const data = await res.json();
      setIntimacyActive(data.intimacy_active);
      addToast(data.intimacy_active ? "Intimacy Phase Activated 💖" : "Returning to Work Mode 💼", data.intimacy_active ? "success" : "info");
      setShowPalette(false);
    } catch { addToast("Failed to toggle intimacy mode", "error"); }
  }, [intimacyActive, addToast]);

  // --- 6. PLAIN VALUES ---
  const paletteMenuItems = [
    { icon: <Heart size={18} className={intimacyActive ? "text-pink-500 fill-pink-500" : ""}/>, name: intimacyActive ? "Deactivate Soulmate" : "Activate Soulmate", desc: "Phase Utama Keintiman", action: toggleIntimacy },
    { icon: <Zap size={18}/>, name: "Kelola Aplikasi", desc: "Lihat kemampuan MIA", link: "/settings" },
    { icon: <ImageIcon size={18}/>, name: "Change Background", desc: "Appearance settings", link: "/settings" },
    { icon: <Database size={18}/>, name: "Clear Memory", desc: "Reset chat history", action: () => { setInput("/clear"); sendMessage(); setShowPalette(false); } },
    { icon: <XCircle size={18}/>, name: "Close Palette", desc: "Or press ESC", action: () => setShowPalette(false) }
  ];


  // --- 7. EFFECTS ---
  useEffect(() => {
    // History, Memory and Intimacy fetching still needed locally or can be moved to context
    const fetchHistory = () => {
      fetch('/api/chat/history')
        .then(res => res.json())
        .then(data => setMessages(data.history || []))
        .catch(() => setTimeout(fetchHistory, 1000));
    };
    fetchHistory();

    const fetchMemory = () => {
      fetch('/api/memory/files')
        .then(res => res.json())
        .then(data => setMemoryFiles(data.files || []))
        .catch(() => setTimeout(fetchMemory, 1000));
    };
    fetchMemory();

    const fetchIntimacyStatus = () => {
      fetch('/api/intimacy/status')
        .then(res => res.json())
        .then(data => setIntimacyActive(data.intimacy_active))
        .catch(() => {});
    };
    fetchIntimacyStatus();
    const intimacyInterval = setInterval(fetchIntimacyStatus, 5000);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/heartbeat`;
    ws.current = new WebSocket(wsUrl);
    ws.current.onopen = () => setStatus("Connected (Heartbeat Active)");
    ws.current.onclose = () => setStatus("Disconnected");
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message" || data.type === "system") {
        setIsThinking(false); 
        playSFX('receive');
        
        const isError = data.content.startsWith("[SYSTEM ERROR]");
        const role = (data.type === "system" || isError) ? "System" : "MIA";
        const cleanContent = isError ? data.content.replace("[SYSTEM ERROR]", "").trim() : data.content;

        const newMessage = { 
          id: data.id || Date.now(), 
          role: role, 
          content: cleanContent, 
          audio: data.audio 
        };
        
        setMessages(prev => [...prev, newMessage]);

        // Only play audio if it's a real MIA message (not a system error/notification)
        if (data.audio && !isTTSMuted && role === "MIA") {
          playAudio(data.audio);
        }
      } else if (data.type === "status") {
        setStatus(`Connected (${data.content})`);
        setIsThinking(data.content === "Thinking...");
      } else if (data.type === "health") {
        setStatus(data.backend === "ok" ? "Connected" : "Disconnected");
        setBrainStatus(data.brain === "ok" ? "Connected" : "Disconnected");
      }
    };

    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowPalette(prev => !prev); playSFX('pop'); }
      if (e.key === 'Escape') setShowPalette(false);
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      window.removeEventListener('keydown', handleGlobalShortcuts);
      clearInterval(intimacyInterval); 
    };
  }, [isTTSMuted, playAudio, playSFX]);


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (location.state && location.state.initialInput) {
      // Use timeout to avoid sync setState in effect lint error
      const tid = setTimeout(() => {
        setInput(location.state.initialInput);
        if (inputRef.current) inputRef.current.focus();
      }, 0);
      return () => clearTimeout(tid);
    }
  }, [location.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (val.trim() && isSpeaking) stopAudio();

    // PERFORMANCE: Only process command/mention logic if strictly necessary
    const cursor = e.target.selectionStart || 0;
    const beforeCursor = val.slice(0, cursor);
    
    // Check if we are currently "inside" a command or mention
    const words = beforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('/') && lastWord.length > 0) {
      setShowCommands(true);
      setShowMentions(false);
      const query = lastWord.toLowerCase();
      // Only filter if there are actually commands to show
      const filtered = COMMANDS.filter(c => c.cmd.startsWith(query));
      setFilteredCommands(filtered);
      setActiveIndex(0);
    } else if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setShowCommands(false);
      const query = lastWord.slice(1).toLowerCase();
      const filtered = memoryFiles.filter(f => f.toLowerCase().includes(query));
      setFilteredFiles(filtered);
      setActiveIndex(0);
    } else {
      if (showCommands) setShowCommands(false);
      if (showMentions) setShowMentions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => (prev + 1) % filteredCommands.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertToken(filteredCommands[activeIndex].cmd + " ");
      }
    } else if (showMentions) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(prev => (prev + 1) % filteredFiles.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(prev => (prev - 1 + filteredFiles.length) % filteredFiles.length); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertToken("@" + filteredFiles[activeIndex] + " ");
      }
    } else if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const insertToken = (token: string) => {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart || 0;
    const beforeCursor = input.slice(0, cursor);
    const afterCursor = input.slice(cursor);
    const words = beforeCursor.split(' ');
    words.pop();
    const newBefore = words.length > 0 ? words.join(' ') + ' ' + token : token;
    setInput(newBefore + afterCursor);
    setShowCommands(false);
    setShowMentions(false);
    inputRef.current.focus();
  };

  // Already handled above


  const handleTouch = async () => {
    try {
      const res = await fetch('/api/intimacy/touch', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'resonated' && data.audio) {
        playAudio(data.audio);
      }
    } catch {
      console.error("[Intimacy] Touch failed");
    }
  };

  const handleMic = async () => {
    if (isRecording) {
      mediaRecorder.current?.stop();
      setIsRecording(false);
      return;
    }

    // Stop MIA from speaking if user wants to record
    if (isSpeaking) {
      stopAudio();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        
        setIsThinking(true);
        addToast("Transcribing audio...", "info");
        try {
          const res = await fetch('/api/stt', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.status === 'success') {
            setInput(prev => prev + (prev ? " " : "") + data.text);
            addToast("Audio transcribed", "success");
          } else {
            addToast("STT Error: " + data.message, "error");
          }
        } catch {
          addToast("Failed to connect to STT API", "error");
        } finally {
          setIsThinking(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      addToast("Listening... (Click mic again to stop)", "info");
    } catch {
      addToast("Microphone permission denied", "error");
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    addToast(`Uploading ${type}: ${file.name}...`, "info");
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload-bg', { // Shared endpoint for now
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        setInput(prev => prev + (prev ? " " : "") + `[ATTACHED ${type}](${data.url}) `);
        addToast("File uploaded and linked", "success");
      }
    } catch {
      addToast("Upload failed", "error");
    }
    setShowAttachMenu(false);
  }, [addToast]);

  const captureScreen = useCallback(async () => {
    addToast("Capturing screen...", "info");
    try {
      const res = await fetch('/api/agent/screenshot', { method: 'POST' });
      const data = await res.json();
      if (data.status === 'success') {
        setInput(prev => prev + (prev ? " " : "") + `[ATTACHED IMAGE](${data.url}) `);
        addToast("Screen captured and linked", "success");
      }
    } catch {
      addToast("Screen capture failed", "error");
    }
    setShowAttachMenu(false);
  }, [addToast]);



  const handleDelete = async (id: number) => {
    await fetch(`/api/chat/message/${id}`, { method: 'DELETE' });
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleEdit = (id: number, content: string) => {
    setEditingId(id);
    setEditValue(content);
  };

  const saveEdit = async () => {
    if (editingId === null) return;
    await fetch(`/api/chat/message`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: editingId, content: editValue })
    });
    setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content: editValue } : m));
    setEditingId(null);
  };

  const handleLike = async (id: number, liked: number) => {
    await fetch(`/api/chat/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: id, liked })
    });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_liked: liked } : m));
  };

  const handlePin = async (id: number) => {
    await fetch(`/api/chat/pin/${id}`, { method: 'POST' });
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_pinned: true } : m));
  };

  if (configLoading || !config) return <div className="h-screen w-full flex items-center justify-center text-primary font-mono animate-pulse bg-transparent">Loading MIA Core...</div>;

  const uiOpacity = config.appearance.ui_opacity;

  return (
    <div 
      className={`w-full h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-hidden transition-all ${isDragging ? 'scale-[0.98] blur-[2px]' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); /* handleFileUpload can be adapted for drops */ }}
    >
        {/* Sentiment-Based Mood Overlay */}
        <div 
          className={`fixed inset-0 z-0 transition-all duration-3000 pointer-events-none ${
            intimacyActive ? 'bg-pink-500/5' :
            mood === 'energetic' ? 'bg-primary/5' : 
            mood === 'serious' ? 'bg-error/5' : 
            mood === 'warm' ? 'bg-orange-500/10' : 'bg-transparent'
          }`}
        ></div>

        {/* Background Ducking Overlay (Cinema Mode) */}
        <div 
          className={`fixed inset-0 z-0 bg-black/60 backdrop-blur-md transition-all duration-1000 pointer-events-none ${
            (isSpeaking || intimacyActive) ? 'opacity-100' : 'opacity-0'
          } ${intimacyActive ? 'shadow-[inset_0_0_150px_rgba(255,100,150,0.3)]' : ''}`}
        ></div>
        {isDragging && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-primary/20 backdrop-blur-md border-4 border-dashed border-primary m-10 rounded-[3rem] animate-pulse">
            <div className="text-center text-primary">
              <Download size={64} className="mx-auto mb-4" />
              <h2 className="text-3xl font-bold font-mono tracking-tighter">DROP TO ANALYZE</h2>
            </div>
          </div>
        )}
        
        {/* Floating Top Controls */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 pointer-events-none">
          {/* Left: Status & Aura */}
          <div className="flex items-center gap-4 pointer-events-auto">
            <div 
              className="relative cursor-pointer group/aura"
              onClick={handleTouch}
            >
              <Activity className={
                intimacyActive ? "text-pink-500 animate-heartbeat z-10 relative" :
                status.includes("Connected") ? "text-primary animate-pulse z-10 relative" : "text-error z-10 relative"
              } size={20} />
              {(isSpeaking || (intimacyActive && audioLevel > 5)) && (
                <div 
                  className={`absolute inset-0 rounded-full blur-md transition-transform duration-75 ${intimacyActive ? 'bg-pink-500/40' : 'bg-primary/40'}`}
                  style={{ transform: `scale(${1 + (audioLevel / 50)})`, opacity: 0.3 + (audioLevel / 150) }}
                ></div>
              )}
            </div>
            
            {isSpeaking && (
              <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Voice Active</span>
                <div className="flex items-end gap-[2px] h-3">
                  {[1,2,3,4,5].map(i => (
                    <WaveformBar key={i} level={audioLevel} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4 pointer-events-auto bg-black/20 backdrop-blur-md p-2 rounded-full border border-white/5">
            <button 
              onClick={() => {
                if (window.confirm("Hapus seluruh riwayat chat?")) {
                  fetch('/api/chat/history', { method: 'DELETE' }); 
                  setMessages([]); 
                  addToast("Chat history cleared", "info");
                }
              }} 
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-error"
              title="Clear All Chat"
            >
              <Trash2 size={20} />
            </button>
            <button onClick={() => setIsTTSMuted(!isTTSMuted)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              {isTTSMuted ? <VolumeX size={20} className="text-white/40" /> : <Volume2 size={20} className="text-primary" />}
            </button>
            <Link to="/settings" className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-primary">
              <Settings2 size={20} />
            </Link>
          </div>
        </div>


        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-6 custom-scrollbar scroll-smooth">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center opacity-40">
              <div className="px-6 py-4 rounded-2xl border border-white/10 font-mono text-white text-center">
                <Brain className="mx-auto mb-2 opacity-50" size={40} />
                Awaiting commands...<br/>
                <span className="text-xs">Type / for commands, @ for context</span>
              </div>
            </div>
          )}
          
          {messages
            .filter(msg => !(msg.role === 'System' && msg.content.includes("MIA Core Connected")))
            .map((msg, idx) => (
            <ChatBubble 
              key={msg.id || idx} 
              msg={msg} 
              isMIA={msg.role === 'MIA'}
              isSys={msg.role === 'System'}
              config={config}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onLike={handleLike}
              onPin={handlePin}
              isEditing={editingId === msg.id}
              editValue={editValue}
              onEditChange={setEditValue}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative flex flex-col gap-2 shrink-0">
          {/* Status LEDs - Instrument Panel Style */}
          <div className="absolute -bottom-5 left-7 flex gap-2.5 z-10 px-1">
            <div className="flex flex-col items-center gap-0.5">
              <div 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                  status.includes("Connected") 
                  ? 'bg-primary shadow-[0_0_10px_rgba(0,255,204,1)] animate-pulse' 
                  : 'bg-error shadow-[0_0_10px_rgba(255,68,68,1)]'
                }`}
                title="Backend Link (LNK)"
              ></div>
              <span className="text-[6px] font-black tracking-tighter text-white/20 uppercase">Lnk</span>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <div 
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  brainStatus === "Connected" 
                  ? `bg-secondary shadow-[0_0_10px_rgba(255,255,0,1)] ${isThinking ? 'animate-ping' : 'animate-pulse'}` 
                  : 'bg-error shadow-[0_0_10_rgba(255,68,68,1)]'
                }`}
                title="Brain Link (BRN)"
              ></div>
              <span className="text-[6px] font-black tracking-tighter text-white/20 uppercase">Brn</span>
            </div>
          </div>

          {showAttachMenu && (
            <div className="absolute bottom-[110%] left-0 w-64 p-4 grid grid-cols-3 gap-3 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50">
              <button onClick={() => document.getElementById('attach-img')?.click()} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-white/10 text-white/80 hover:text-primary transition-colors">
                <ImageIcon size={20} />
                <span className="text-[10px] font-mono">Image</span>
              </button>
              <button onClick={() => document.getElementById('attach-file')?.click()} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-white/10 text-white/80 hover:text-primary transition-colors">
                <FileText size={20} />
                <span className="text-[10px] font-mono">File</span>
              </button>
              <button onClick={captureScreen} className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-white/10 text-white/80 hover:text-primary transition-colors">
                <MonitorUp size={20} />
                <span className="text-[10px] font-mono">Screen</span>
              </button>
            </div>

          )}

          {(showCommands || showMentions) && (
            <div className="absolute bottom-[110%] left-10 w-80 max-h-64 overflow-y-auto custom-scrollbar bg-black/90 backdrop-blur-2xl border border-white/10 rounded-xl py-2 shadow-2xl z-50 font-mono text-sm">
              {showCommands && filteredCommands.map((c, i) => (
                <button key={c.cmd} onClick={() => insertToken(c.cmd + " ")} className={`w-full flex items-center justify-between px-4 py-2 ${activeIndex === i ? 'bg-primary/20 text-primary' : 'text-white/80 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-2">{c.icon} <b>{c.cmd}</b></div>
                  <span className="text-[10px] opacity-50">{c.desc}</span>
                </button>
              ))}
              {showMentions && filteredFiles.map((f, i) => (
                <button key={f} onClick={() => insertToken("@" + f + " ")} className={`w-full flex items-center gap-2 px-4 py-2 ${activeIndex === i ? 'bg-secondary/20 text-secondary' : 'text-white/80 hover:bg-white/10'}`}>
                  <FileText size={16} /> <b>@{f}</b>
                </button>
              ))}
            </div>
          )}

          <div className={`flex items-center gap-3 p-3 rounded-full border border-white/20 backdrop-blur-xl shadow-2xl transition-all ${isThinking ? 'thinking-pulse border-primary shadow-[0_0_20px_rgba(0,255,204,0.3)]' : 'focus-within:border-primary/50'}`} style={{ backgroundColor: `rgba(0, 0, 0, ${uiOpacity + 0.1})` }}>
            <button onClick={() => setShowAttachMenu(!showAttachMenu)} className={`p-3 rounded-full hover:bg-white/10 transition-colors glow-button ${showAttachMenu ? 'text-primary' : 'text-white/60'}`}><Paperclip size={20} /></button>
            
            <input ref={inputRef} type="text" value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder={isThinking ? "MIA is thinking..." : "Message MIA..."} className="flex-1 bg-transparent border-none outline-none font-sans text-lg text-white" disabled={isThinking} />
            
            <button onClick={handleMic} className={`p-3 rounded-full hover:bg-white/10 transition-colors glow-button ${isRecording ? 'text-secondary animate-pulse' : 'text-white/60 hover:text-primary'}`}><Mic size={20} /></button>
            
            <button onClick={sendMessage} disabled={!input.trim() || isThinking} className="p-3 mr-1 rounded-full bg-primary text-black hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale">
              {isThinking ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input type="file" id="attach-img" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'IMAGE')} />
          <input type="file" id="attach-file" className="hidden" onChange={(e) => handleFileUpload(e, 'FILE')} />
        </div>

        {/* Toast Notification Hub */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className="toast">
              {t.type === 'error' ? <AlertCircle size={16} className="text-error"/> : t.type === 'success' ? <Check size={16} className="text-success"/> : <InfoIcon size={16} className="text-primary"/>}
              {t.msg}
            </div>
          ))}
        </div>

        {/* Global Command Palette */}
        {showPalette && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setShowPalette(false)}></div>
            <div className="relative w-full max-w-xl bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center gap-4">
                <Search className="text-primary" size={20} />
                <input 
                  autoFocus
                  placeholder="Type a command or search settings..."
                  className="bg-transparent border-none outline-none text-white text-lg w-full font-sans"
                />
              </div>
               <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-4 mb-2">Quick Actions</div>
                  {paletteMenuItems.map((item, i) => (
                  <div 
                    key={i} 
                    onClick={() => item.action ? item.action() : null}
                    className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-white/5 text-white/40 group-hover:text-primary transition-colors">{item.icon}</div>
                      <div>
                        <div className="text-sm font-bold text-white/80 group-hover:text-white">{item.name}</div>
                        <div className="text-[10px] text-white/30">{item.desc}</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-white/10 group-hover:text-primary transition-colors">ENTER</div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-white/5 flex justify-between items-center">
                <div className="text-[10px] text-white/20 font-mono">COMMAND PALETTE v1.0</div>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-white/40">ESC to close</span>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

interface ChatBubbleProps {
  msg: Message;
  isMIA: boolean;
  isSys: boolean;
  config: MIAConfig;
  onDelete: (id: number) => void;
  onEdit: (id: number, content: string) => void;
  onLike: (id: number, liked: number) => void;
  onPin: (id: number) => void;
  isEditing: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

function ChatBubble({ msg, isMIA, isSys, config, onDelete, onEdit, onLike, onPin, isEditing, editValue, onEditChange, onSaveEdit, onCancelEdit }: ChatBubbleProps) {
  const [isCopied, setIsCopied] = useState(false);
  
  // Helper to determine text color based on background luminance
  const getContrastYIQ = (hexcolor: string) => {
    if (!hexcolor || hexcolor.startsWith('rgba')) return 'white'; // Default to white for transparent/rgba
    hexcolor = hexcolor.replace("#", "");
    const r = parseInt(hexcolor.substr(0,2),16);
    const g = parseInt(hexcolor.substr(2,2),16);
    const b = parseInt(hexcolor.substr(4,2),16);
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? 'black' : 'white';
  };

  const bubbleBg = isMIA ? config.appearance.bubble_color_mia : (isSys ? 'rgba(0,0,0,0.3)' : config.appearance.bubble_color_user);
  const textColor = isSys ? 'text-secondary' : (getContrastYIQ(bubbleBg) === 'black' ? 'text-black' : 'text-white');
  const mutedTextColor = getContrastYIQ(bubbleBg) === 'black' ? 'text-black/50' : 'text-white/50';

  const videoMatch = msg.content.match(/\[VIDEO\]\((.*?)\)/) || msg.content.match(/src="([^"]*?\.mp4)"/);
  const videoUrl = videoMatch ? videoMatch[1] : null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(msg.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`flex ${isMIA || isSys ? 'justify-start' : 'justify-end'} group relative mb-2 animate-chat-spring`}>
      <div 
        className={`max-w-[85%] p-6 rounded-[2.5rem] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border transition-all duration-500 hover:scale-[1.01] ${
          isMIA ? 'border-primary/30 rounded-tl-none' : isSys ? 'bg-black/40 border-secondary/20 italic' : 'border-white/20 rounded-tr-none'
        } ${textColor}`}
        style={{ 
          backgroundColor: bubbleBg,
          background: !isSys ? `linear-gradient(145deg, ${bubbleBg}, ${bubbleBg}dd)` : undefined,
          boxShadow: isMIA ? `0 10px 40px -10px rgba(0, 255, 204, 0.2), 0 20px 50px rgba(0,0,0,0.3)` : `0 20px 50px rgba(0,0,0,0.3)`
        }}
      >
        <div className={`flex items-center justify-between mb-4 ${mutedTextColor} font-mono text-[10px] uppercase tracking-[0.3em]`}>
          <span className="font-extrabold flex items-center gap-2">
            {isMIA && <Sparkles size={12} className="text-primary animate-pulse" />}
            {msg.role}
          </span>
          <div className="flex items-center gap-3">
            {msg.is_pinned && <Pin size={12} className="text-primary fill-primary" />}
            <span className="opacity-70">{msg.timestamp?.slice(11, 16)}</span>
          </div>
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-2">
            <textarea 
              value={editValue} 
              onChange={(e) => onEditChange(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded-lg p-2 text-white font-sans outline-none focus:border-primary"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button onClick={onCancelEdit} className="px-3 py-1 text-xs text-white/60 hover:text-white">Cancel</button>
              <button onClick={onSaveEdit} className="px-3 py-1 text-xs bg-primary text-black rounded-md font-bold">Save</button>
            </div>
          </div>
        ) : (
          <div className={`prose ${textColor === 'text-black' ? 'prose-black' : 'prose-invert'} max-w-none prose-sm leading-relaxed tracking-wide`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <SyntaxHighlighter
                      style={atomDark as { [key: string]: React.CSSProperties }}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>{children}</code>
                  )
                }
              }}
            >
              {msg.content.replace(/\[VIDEO\]\(.*?\)/g, '')}
            </ReactMarkdown>
          </div>
        )}

        {videoUrl && (
          <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/40">
            <video 
              src={videoUrl.startsWith('/') ? `/api/video/play?path=${encodeURIComponent(videoUrl)}` : videoUrl} 
              controls 
              className="w-full max-h-96"
            />
            <div className="p-2 flex justify-between items-center bg-black/60">
              <span className="text-[10px] text-white/40 flex items-center gap-1"><PlayCircle size={12}/> MIA Generated Video</span>
              <a 
                href={videoUrl.startsWith('/') ? `/api/video/play?path=${encodeURIComponent(videoUrl)}` : videoUrl} 
                download 
                className="p-1 hover:text-primary transition-colors"
                title="Download Video"
              >
                <Download size={16} />
              </a>
            </div>
          </div>
        )}

        {/* Audio handled by Global Controller */}

        {/* Action Bar */}
        {!isSys && !isEditing && (
          <div className="mt-4 pt-2 border-t border-white/5 flex items-center justify-between gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3">
              {isMIA ? (
                <>
                  <button onClick={() => msg.id && onLike(msg.id, 1)} className={`hover:text-primary transition-colors ${msg.is_liked === 1 ? 'text-primary' : 'text-white/40'}`}><ThumbsUp size={14} /></button>
                  <button onClick={() => msg.id && onLike(msg.id, -1)} className={`hover:text-error transition-colors ${msg.is_liked === -1 ? 'text-error' : 'text-white/40'}`}><ThumbsDown size={14} /></button>
                  <button onClick={() => msg.id && onPin(msg.id)} className={`hover:text-primary transition-colors ${msg.is_pinned ? 'text-primary' : 'text-white/40'}`}><Pin size={14} /></button>
                  
                  {/* ARE Feedback: Robotic Response */}
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/chat/feedback/robotic', { method: 'POST' });
                        const data = await res.json();
                        alert(`MIA acknowledges this was robotic. Respect Level: ${data.new_respect}%`);
                      } catch (err) {
                        console.error("Failed to report robotic response", err);
                      }
                    }}
                    className="text-white/20 hover:text-red-400 transition-colors flex items-center gap-1 group/robot"
                    title="This response felt robotic"
                  >
                    <Zap size={12} className="group-hover/robot:animate-ping" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => msg.id && onEdit(msg.id, msg.content)} className="text-white/40 hover:text-primary transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => msg.id && onDelete(msg.id)} className="text-white/40 hover:text-error transition-colors"><Trash2 size={14} /></button>
                </>
              )}
            </div>
            <button onClick={copyToClipboard} className="text-white/40 hover:text-white transition-colors">
              {isCopied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
