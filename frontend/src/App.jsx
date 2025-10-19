import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Sparkles, BookOpen, Video, Play, 
  Send, ChevronDown, Bot, User, Camera, Trophy, 
  GraduationCap, BookMarked, ChevronRight, FileUp, XCircle, 
  FileText, Brain, Zap, 
  TrendingUp, Clock, Award
} from 'lucide-react';

// --- NEW: Import your logo image ---
import logoImage from './assets/vidyantra-logo.jpg'; // Make sure this path is correct!

const API_ENDPOINT = 'https://6k33ewxb4mcw6qb7x562vtokpq0wjlxf.lambda-url.us-east-1.on.aws/';

// --- REUSABLE COMPONENTS ---

function NeuralLoadingAnimation() {
  const [nodes, setNodes] = useState([]);
  
  useEffect(() => {
    const generateNodes = () => {
      return Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      }));
    };
    setNodes(generateNodes());
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        {nodes.map((node, i) => (
          <g key={node.id}>
            {nodes.slice(i + 1).map((otherNode, j) => (
              <motion.line
                key={`${i}-${j}`}
                x1={node.x}
                y1={node.y}
                x2={otherNode.x}
                y2={otherNode.y}
                stroke="url(#lineGradient)"
                strokeWidth="0.2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: [0, 1, 0],
                  opacity: [0, 0.3, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: node.delay + j * 0.1
                }}
              />
            ))}
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="1"
              fill="url(#nodeGradient)"
              initial={{ scale: 0 }}
              animate={{ 
                scale: [0, 1.5, 1],
                opacity: [0, 1, 0.6]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: node.delay
              }}
            />
          </g>
        ))}
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
            <stop offset="50%" stopColor="#c084fc" stopOpacity="1" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="nodeGradient">
            <stop offset="0%" stopColor="#a5f3fc" />
            <stop offset="100%" stopColor="#818cf8" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

function ProgressRing({ progress = 45, size = 60 }) {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
          className="text-slate-200/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference
          }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold bg-gradient-to-br from-indigo-600 to-pink-600 bg-clip-text text-transparent">
          {progress}%
        </span>
      </div>
    </div>
  );
}

function GlassCard({ children, className = "", hover = true, ...props }) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      transition={{ type: "spring", stiffness: 300 }}
      className={`relative backdrop-blur-2xl bg-slate-900/70 rounded-3xl shadow-xl border border-white/10 ${className}`}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-950/90 rounded-3xl" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// --- FIXED: Updated AnimatedLogo Component ---
function AnimatedLogo({ className = "w-12 h-12" }) {
  return (
    <motion.div
      className={`relative ${className}`} // Use className to control size
      animate={{ rotate: [0, 5, -5, 0] }} // Keep the subtle rotation
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Replace SVG with img tag */}
      <img
        src={logoImage}
        alt="Vidyantra AI Logo"
        className="w-full h-full object-contain" // Make image fill the container
      />
    </motion.div>
  );
}
// --- End Fix ---

// --- MAIN APP COMPONENT ---

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [userId, setUserId] = useState('');
  const [userProfile, setUserProfile] = useState({ board: 'CBSE', grade: '8th' });
  const [query, setQuery] = useState('');
  const [uploadedPDF, setUploadedPDF] = useState(null); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); 
  const [todayProgress, setTodayProgress] = useState(45);
  const [lastTopic, setLastTopic] = useState('Photosynthesis');

  const handleLogin = () => {
    if (userId.trim() !== 'student123') {
      return; 
    }
    setCurrentScreen('dashboard');
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setUploadedPDF(event.target.files[0]);
    }
  };

  const handleGenerate = async () => {
    if (!query.trim()) return;

    const currentQuery = query; 
    const userMessage = { 
      role: 'user', 
      query: currentQuery, 
      timestamp: new Date().toLocaleTimeString() 
    };

    setChatHistory(prev => [...prev, userMessage]); 
    setIsGenerating(true);
    setCurrentScreen('learning');
    setQuery(''); 

    // TODO: Send uploadedPDF if present
    // You'll likely need FormData here if sending the file itself
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          UserID: userId,
          query: currentQuery, 
          grade_level: userProfile.grade,
          board: userProfile.board
          // Add file info or send FormData if needed
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server');
      }

      const formattedImages = Array.isArray(data.imageUrls) 
        ? data.imageUrls.map((url, index) => ({
            id: index + 1,
            url: url || 'https://via.placeholder.com/800x600?text=Image+Not+Available',
            title: `Generated Scene ${index + 1}`
          }))
        : [];

      const botMessage = {
        role: 'bot',
        query: currentQuery,
        script: data.script || 'No explanation generated.',
        detailed_explanation: data.detailed_explanation || data.script || 'No detailed explanation available.',
        images: formattedImages.length > 0 ? formattedImages : [], 
        videoUrl: data.videoUrl || null,
        audioUrl: data.audioUrl || null, 
        timestamp: new Date().toLocaleTimeString(),
        error: null
      };
      
      setChatHistory(prev => [...prev, botMessage]); 

      setTodayProgress(Math.min(todayProgress + 15, 100));
      setLastTopic(currentQuery);
    } catch (error) {
      console.error('Generation error:', error);
      
      const errorMessage = {
        role: 'bot',
        query: currentQuery,
        script: `Unable to generate content: ${error.message}`,
        detailed_explanation: `An error occurred while processing your request. ${error.message}. Please try again.`,
        images: [],
        videoUrl: null,
        audioUrl: null,
        timestamp: new Date().toLocaleTimeString(),
        error: error.message
      };
      
      setChatHistory(prev => [...prev, errorMessage]); 
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900 to-slate-900" />
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1]
            }}
            transition={{
              duration: 3 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {currentScreen === 'login' && (
          <LoginScreen 
            key="login"
            userId={userId}
            setUserId={setUserId}
            handleLogin={handleLogin}
          />
        )}
        {currentScreen === 'dashboard' && (
          <DashboardScreen 
            key="dashboard"
            userId={userId}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            query={query}
            setQuery={setQuery}
            todayProgress={todayProgress}
            lastTopic={lastTopic}
            handleGenerate={handleGenerate}
            uploadedPDF={uploadedPDF}
            onFileChange={handleFileChange}
            onClearFile={() => setUploadedPDF(null)}
          />
        )}
        {currentScreen === 'learning' && (
          <LearningScreen 
            key="learning"
            isGenerating={isGenerating}
            chatHistory={chatHistory}
            setCurrentScreen={setCurrentScreen}
            setQuery={setQuery}
            handleGenerate={handleGenerate} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SCREEN COMPONENTS ---

function LoginScreen({ userId, setUserId, handleLogin }) {
  const [localError, setLocalError] = useState('');

  const handleSubmit = () => {
    setLocalError('');
    if (!userId.trim()) {
      setLocalError('Please enter a valid User ID');
      return;
    }
    
    if (userId.trim() !== 'student123') {
      setLocalError('Invalid User ID. Please use "student123" for demo access.');
      return;
    }
    
    handleLogin();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen flex items-center justify-center p-6 z-10"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="relative max-w-md w-full"
      >
        <GlassCard className="p-12">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-center mb-8"
          >
            {/* Logo will use the new component */}
            <AnimatedLogo className="w-24 h-24 mx-auto mb-6" /> 
            <motion.h1 
              className="text-5xl font-bold mb-3 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{ backgroundSize: '200% auto' }}
            >
              Vidyantra AI
            </motion.h1>
            <p className="text-slate-300 text-lg">Where curiosity meets intelligence</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Enter Your User ID
            </label>
            <motion.div
              whileFocus={{ scale: 1.02 }}
              className="relative"
            >
              <input
                type="text"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setLocalError(''); 
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="student123"
                className="w-full px-6 py-5 bg-slate-800/50 backdrop-blur-xl border-2 border-slate-700/50 rounded-2xl focus:border-cyan-400/50 focus:outline-none text-white placeholder-slate-500 mb-2 transition-all"
              />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-pink-400/20 rounded-2xl blur-xl -z-10"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            {localError && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm mb-4 px-2"
              >
                {localError}
              </motion.p>
            )}

            <motion.button
              onClick={handleSubmit} 
              disabled={!userId.trim()}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-full px-8 py-5 rounded-2xl font-bold text-white shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group mt-4" 
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                Enter Experience
                <Sparkles className="w-5 h-5" />
              </span>
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-slate-400 mb-3">Demo Access</p>
            <code className="px-4 py-2 bg-white/5 rounded-lg text-cyan-400 text-sm font-mono">
              student123
            </code>
          </motion.div>
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}

function DashboardScreen({ 
  userId, 
  userProfile, 
  setUserProfile, 
  query, 
  setQuery, 
  todayProgress,
  lastTopic,
  handleGenerate,
  uploadedPDF,
  onFileChange,
  onClearFile
}) {
  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
  const boards = ['CBSE', 'ICSE', 'State'];
  const grades = ['6th', '7th', '8th', '9th', '10th', '11th', '12th'];
  
  const fileInputRef = useRef(null);
  
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen z-10"
    >
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-2xl bg-white/10 border-b border-white/10"
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* Logo will use the new component */}
            <AnimatedLogo className="w-10 h-10" /> 
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Vidyantra
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <ProgressRing progress={todayProgress} size={50} />
            <GlassCard className="px-4 py-2 flex items-center gap-2" hover={false}>
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">{userId}</span>
            </GlassCard>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-12"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-4"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {timeOfDay === 'morning' ? '☀️' : timeOfDay === 'afternoon' ? '🌤️' : '🌙'}
            </motion.div>
            <h1 className="text-6xl font-bold text-white">
              Good {timeOfDay}, {userId}
            </h1>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-300 flex items-center gap-2"
          >
            <Clock className="w-5 h-5 text-cyan-400" />
            Continue where you left: <span className="text-purple-400 font-semibold">{lastTopic}</span>
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <GlassCard className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Sparkles className="w-8 h-8 text-cyan-400" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white">What sparks your curiosity?</h2>
            </div>

            <div className="relative">
              <motion.input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Ask anything... or upload a PDF below to ask about it"
                whileFocus={{ scale: 1.01 }}
                className="w-full px-8 py-6 bg-slate-800/50 backdrop-blur-xl border-2 border-slate-700/50 rounded-3xl focus:border-cyan-400/50 focus:outline-none text-white placeholder-slate-500 text-lg pr-32"
              />
              
              <motion.button
                onClick={handleGenerate}
                disabled={!query.trim()}
                whileHover={{ scale: 1.05, x: 2 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-pink-500 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Generate
                <Zap className="w-5 h-5" />
              </motion.button>
            </div>
          </GlassCard>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-bold text-white">Learning Profile</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Board</label>
                  <div className="flex gap-2">
                    {boards.map((board) => (
                      <motion.button
                        key={board}
                        onClick={() => setUserProfile({ ...userProfile, board })}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                          userProfile.board === board
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
                        }`}
                      >
                        {board}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Grade</label>
                  <div className="grid grid-cols-4 gap-2">
                    {grades.map((grade) => (
                      <motion.button
                        key={grade}
                        onClick={() => setUserProfile({ ...userProfile, grade })}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        className={`px-3 py-3 rounded-xl font-semibold transition-all ${
                          userProfile.grade === grade
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50'
                        }`}
                      >
                        {grade}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
          
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookMarked className="w-6 h-6 text-pink-400" />
                  Contextual Learning
                </h3>
                {uploadedPDF && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1, rotate: 10 }}
                    onClick={onClearFile}
                    className="text-slate-400 hover:text-white"
                  >
                    <XCircle className="w-5 h-5" />
                  </motion.button>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept=".pdf" 
              />
              
              {!uploadedPDF ? (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={handleUploadClick} 
                  className="border-2 border-dashed border-slate-700/50 rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-400/50 transition-all bg-slate-800/30 h-40 flex flex-col items-center justify-center"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <FileUp className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                  </motion.div>
                  <p className="text-slate-300 font-medium mb-2">Upload Chapter PDF</p>
                  <p className="text-xs text-slate-400">Drag & drop or click to browse</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 text-center bg-slate-800/30 rounded-2xl h-40 flex flex-col items-center justify-center"
                >
                  <FileText className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-200 font-medium mb-2 truncate w-full" title={uploadedPDF.name}>
                    {uploadedPDF.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    Ready to be analyzed with your next query.
                  </p>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
          
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Trophy className="w-10 h-10 text-amber-400" />
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent"
                >
                  12
                </motion.span>
              </div>
              <h3 className="text-white font-semibold mb-1">Topics Mastered</h3>
              <p className="text-xs text-slate-400">+3 this week</p>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-10 h-10 text-emerald-400" />
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                  className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"
                >
                  4.2h
                </motion.span>
              </div>
              <h3 className="text-white font-semibold mb-1">Study Time</h3>
              <p className="text-xs text-slate-400">This week</p>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-3">
                <Award className="w-10 h-10 text-purple-400" />
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                  className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
                >
                  8
                </motion.span>
              </div>
              <h3 className="text-white font-semibold mb-1">Streak Days</h3>
              <p className="text-xs text-slate-400">Keep it up! 🔥</p>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// --- REFACTORED CHAT SCREEN ---
function LearningScreen({ isGenerating, chatHistory, setCurrentScreen, setQuery, handleGenerate }) {
  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isGenerating]);

  if (!isGenerating && (!chatHistory || chatHistory.length === 0)) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative min-h-screen flex items-center justify-center z-10"
      >
        <GlassCard className="p-12 max-w-md text-center">
          <p className="text-white text-lg">Ask a question to get started.</p>
          <motion.button
            onClick={() => setCurrentScreen('dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-6 px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold"
          >
            Return to Dashboard
          </motion.button>
        </GlassCard>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      ref={scrollRef}
      className="relative min-h-screen overflow-y-auto z-10"
    >
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-2xl bg-black/30 border-b border-white/10"
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <motion.button
            onClick={() => {
              setCurrentScreen('dashboard');
            }}
            whileHover={{ scale: 1.05, x: -3 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-all"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back
          </motion.button>
          
          <div className="flex items-center gap-3">
             {/* Logo will use the new component */}
            <AnimatedLogo className="w-8 h-8" /> 
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              Vidyantra
            </span>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-6 py-8 max-w-2xl pb-32">
        {chatHistory.map((message, index) => (
          <React.Fragment key={index}>
            {message.role === 'user' && (
              <UserQueryCard query={message.query} timestamp={message.timestamp} />
            )}
            {message.role === 'bot' && (
              <AIResponseCard generatedContent={message} /> 
            )}
          </React.Fragment>
        ))}
        
        {isGenerating && <GenerativeLoadingState />} 
        
        <div ref={messagesEndRef} />

        <FollowUpCard 
          chatHistory={chatHistory} 
          setQuery={setQuery} 
          handleGenerate={handleGenerate} 
        />
      </div>
    </motion.div>
  );
}

// --- CHAT COMPONENTS ---

function UserQueryCard({ query, timestamp }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex items-start gap-4">
        <motion.div 
          whileHover={{ scale: 1.1, rotate: 5 }}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg"
        >
          <User className="w-6 h-6 text-white" />
        </motion.div>
        <div className="flex-1">
          <GlassCard className="px-6 py-4">
            <p className="text-white text-lg font-medium">{query}</p>
            <span className="text-xs text-slate-400 mt-2 block">{timestamp}</span>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  );
}

function AIResponseCard({ generatedContent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-8"
    >
      <GlassCard className="overflow-hidden" hover={false}>
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
            >
              <Bot className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-white font-bold">Vidyantra AI</h3>
              <p className="text-xs text-slate-400">Personalized for you</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.button>
        </div>

        {generatedContent.videoUrl && (
          <div className="relative aspect-video bg-black mx-6 mb-6 rounded-2xl overflow-hidden">
            <video
              src={generatedContent.videoUrl}
              controls
              preload="auto"
              className="w-full h-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        <div className="p-6"> 
          
          {generatedContent.error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl"
            >
              <p className="text-red-300 text-sm">⚠️ {generatedContent.error}</p>
            </motion.div>
          )}

          <div className="mb-4">
            <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-xl">
              <BookOpen className="w-5 h-5 text-purple-400" />
              Detailed Explanation
            </h4>
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-slate-200 text-base leading-relaxed whitespace-pre-line"
            >
              {generatedContent.detailed_explanation || generatedContent.script}
            </motion.p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function FollowUpCard({ chatHistory, setQuery, handleGenerate }) {
  const [followUpQuery, setFollowUpQuery] = useState('');
  
  const lastBotMessage = [...chatHistory].reverse().find(m => m.role === 'bot' && m.query);
  const lastQuery = lastBotMessage ? lastBotMessage.query : 'this topic';

  const suggestions = [
    `Explain ${lastQuery} deeper`,
    `What topics are related to ${lastQuery}?`,
    `Give me practice questions on ${lastQuery}`
  ];

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleGenerate(); 
  };

  const handleFollowUpSubmit = () => {
    if (!followUpQuery.trim()) return;
    setQuery(followUpQuery);
    handleGenerate(); 
    setFollowUpQuery(''); 
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-xl font-bold text-white">Continue Learning</h3>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Ask a follow-up question..."
            className="w-full px-6 py-4 bg-slate-800/50 backdrop-blur-xl border-2 border-slate-700/50 rounded-2xl focus:border-cyan-400/50 focus:outline-none text-white placeholder-slate-500 pr-14"
            value={followUpQuery}
            onChange={(e) => setFollowUpQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFollowUpSubmit()}
          />
          
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg"
            onClick={handleFollowUpSubmit}
          >
            <Send className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {suggestions.map((suggestion, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-2 bg-slate-800/50 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-purple-500/20 text-slate-300 hover:text-white border border-slate-700/50 hover:border-cyan-500/50 rounded-full text-sm font-medium transition-all"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// --- LOADING COMPONENT ---

function GenerativeLoadingState() {
  const [currentPhase, setCurrentPhase] = useState(0);
  const phases = [
    { icon: Brain, text: 'Analyzing query...', color: 'from-cyan-400 to-blue-500' },
    { icon: FileText, text: 'Generating explanation...', color: 'from-purple-400 to-pink-500' },
    { icon: Camera, text: 'Creating visuals...', color: 'from-pink-400 to-rose-500' },
    { icon: Video, text: 'Producing video...', color: 'from-rose-400 to-orange-500' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % phases.length);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = phases[currentPhase].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex items-center justify-center z-10 my-8" 
    >
      <div className="relative max-w-lg w-full p-12">
        <div className="absolute inset-0 opacity-30">
          <NeuralLoadingAnimation />
        </div>

        <div className="relative z-10 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="mb-12"
            >
              <motion.div
                className={`w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br ${phases[currentPhase].color} flex items-center justify-center shadow-2xl`}
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(139, 92, 246, 0.3)',
                    '0 0 60px rgba(236, 72, 153, 0.6)',
                    '0 0 20px rgba(139, 92, 246, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CurrentIcon className="w-10 h-10 text-white" />
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-3">
                {phases[currentPhase].text}
              </h2>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-3 mb-8">
            {phases.map((phase, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <motion.div
                  className={`h-2 rounded-full transition-all ${
                    index === currentPhase 
                      ? 'w-12 bg-gradient-to-r from-cyan-400 to-pink-400' 
                      : index < currentPhase
                      ? 'w-8 bg-white/50'
                      : 'w-2 bg-white/20'
                  }`}
                  animate={index === currentPhase ? {
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1]
                  } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-slate-400 text-sm mb-2">
              Creating your personalized learning experience...
            </p>
            <motion.p 
              className="text-slate-500 text-xs"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              This usually takes 30-60 seconds
            </motion.p>
          </motion.div>

          <div className="absolute inset-0 pointer-events-none">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                style={{
                  left: `${50 + Math.cos(i * 0.628) * 40}%`,
                  top: `${50 + Math.sin(i * 0.628) * 40}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}