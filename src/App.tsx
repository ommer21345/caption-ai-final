import { useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, Sparkles, Copy, Check, RefreshCw, Type, Hash, Globe, Zap, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { generateCaptions, CaptionOptions, CaptionResponse, Caption } from './services/geminiService';

const TONES = ['Witty', 'Professional', 'Inspirational', 'Minimalist', 'Funny', 'Sarcastic', 'Heartfelt'];
const PLATFORMS = ['Instagram', 'LinkedIn', 'Twitter/X', 'Facebook', 'TikTok'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hebrew', 'Arabic', 'Japanese'];

function CaptionCard({ caption, index }: { caption: Caption; index: number }) {
  const [copied, setCopied] = useState(false);

  const hashtagsStr = Array.isArray(caption.hashtags) ? caption.hashtags.join(' ') : '';
  const fullText = `${caption.hook || ''}\n\n${caption.body || ''}\n\n${caption.cta || ''}\n\n${hashtagsStr}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative"
    >
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={copyToClipboard}
          className="p-2 bg-neutral-50 hover:bg-emerald-50 text-neutral-400 hover:text-emerald-600 rounded-lg border border-neutral-100 transition-colors"
          title="Copy Caption"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Option {index + 1}</span>
        </div>
        
        <div className="space-y-3">
          <p className="font-bold text-neutral-900 leading-tight">{caption.hook || 'Untitled Caption'}</p>
          <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">{caption.body || ''}</p>
          <p className="text-emerald-600 font-medium text-sm italic">{caption.cta || ''}</p>
        </div>

        {Array.isArray(caption.hashtags) && caption.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-50">
            {caption.hashtags.map((tag, i) => (
              <span key={i} className="text-[11px] text-neutral-400 font-medium">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-neutral-900 font-sans selection:bg-emerald-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform">
              <Zap size={22} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-neutral-900 leading-none">CaptionCrafter AI</h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-1">Algorithm Optimized Engine</p>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-neutral-50 rounded-full border border-neutral-100">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Instagram • TikTok • Facebook</span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-12 border-t border-neutral-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <Zap size={16} className="text-emerald-600 group-hover:scale-110 transition-transform" fill="currentColor" />
            <span className="text-sm font-bold text-neutral-900">CaptionCrafter AI</span>
          </Link>
          <p className="text-xs text-neutral-400 font-medium tracking-wide uppercase">© 2026 • Optimized Content Engine • All Rights Reserved</p>
          <div className="flex items-center gap-6">
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-neutral-400 hover:text-emerald-600 transition-colors uppercase tracking-widest">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [options, setOptions] = useState<CaptionOptions>({
    tone: 'Witty',
    platform: 'Instagram',
    language: 'English',
    additionalContext: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CaptionResponse | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await generateCaptions(image, mimeType, options);
      setResult(response);
    } catch (error: any) {
      console.error('Error generating captions:', error);
      let errorMessage = 'Failed to generate captions. Please try again.';
      if (error.message) {
        if (error.message.includes('413')) errorMessage = 'Image is too large for Netlify (Max 6MB). Try a smaller file.';
        else if (error.message.includes('timeout')) errorMessage = 'The request timed out. AI is taking too long to respond.';
        else errorMessage = error.message;
      }
      setResult({ 
        isRaw: true, 
        text: `### Generation Error\n${errorMessage}\n\n**Tip:** If you are on Netlify, ensure your \`OPENROUTER_API_KEY\` is set in the dashboard.` 
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!result) return;
    let text = '';
    if (result.isRaw) {
      text = result.text || '';
    } else if (result.captions) {
      text = result.captions.map((c, i) => {
        const hashtagsStr = Array.isArray(c.hashtags) ? c.hashtags.join(' ') : '';
        return `Option ${i + 1}:\n${c.hook || ''}\n\n${c.body || ''}\n\n${c.cta || ''}\n\n${hashtagsStr}`;
      }).join('\n\n---\n\n');
    }
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Controls (4 cols) */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-8">
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <Upload size={14} /> 1. Source Image
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative aspect-[4/3] rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
                  ${image ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50'}
                  flex flex-col items-center justify-center gap-3 group
                `}
              >
                {image ? (
                  <>
                    <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-sm font-bold flex items-center gap-2">
                        <RefreshCw size={16} /> Replace Image
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-neutral-300 shadow-sm group-hover:scale-110 transition-transform">
                      <ImageIcon size={24} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-neutral-600">Upload Image</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Drag and drop or click</p>
                    </div>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                <Sparkles size={14} /> 2. Strategy
              </label>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 flex items-center gap-2">
                    <Type size={14} /> Tone of Voice
                  </label>
                  <select 
                    value={options.tone}
                    onChange={(e) => setOptions({...options, tone: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 flex items-center gap-2">
                    <Hash size={14} /> Target Platform
                  </label>
                  <select 
                    value={options.platform}
                    onChange={(e) => setOptions({...options, platform: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 flex items-center gap-2">
                    <Globe size={14} /> Output Language
                  </label>
                  <select 
                    value={options.language}
                    onChange={(e) => setOptions({...options, language: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500">Context (Optional)</label>
                  <textarea 
                    placeholder="Add specific details to guide the AI..."
                    value={options.additionalContext}
                    onChange={(e) => setOptions({...options, additionalContext: e.target.value})}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm min-h-[100px] focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none placeholder:text-neutral-300"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!image || loading}
                className={`
                  w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-lg
                  ${!image || loading 
                    ? 'bg-neutral-100 text-neutral-300 cursor-not-allowed shadow-none' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-emerald-200'}
                `}
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={18} /> Analyzing...
                  </>
                ) : (
                  <>
                    <Zap size={18} fill="currentColor" /> Generate Captions
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sidebar Ad Placeholder */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm overflow-hidden relative group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest border border-neutral-200 px-1.5 py-0.5 rounded">Sponsored</span>
              <div className="text-neutral-300 group-hover:text-emerald-500 transition-colors">
                <Sparkles size={12} />
              </div>
            </div>
            <div className="aspect-video bg-neutral-100 rounded-xl mb-3 flex items-center justify-center text-neutral-300 group-hover:bg-emerald-50 transition-colors">
              <ImageIcon size={32} />
            </div>
            <h4 className="text-sm font-bold text-neutral-800 group-hover:text-emerald-600 transition-colors">Boost Your Brand with AI</h4>
            <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">Get 10x more engagement with our premium social media toolkit. Start your free trial today.</p>
            <div className="mt-4 pt-4 border-t border-neutral-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Learn More</span>
              <div className="w-6 h-6 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <Zap size={10} fill="currentColor" />
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Results (8 cols) */}
        <section className="lg:col-span-8 space-y-6">
          {/* Horizontal Banner Ad */}
          <div className="bg-emerald-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-emerald-100 group cursor-pointer">
            <div className="absolute top-0 right-0 p-3">
              <span className="text-[8px] font-bold opacity-50 uppercase tracking-widest">Ad</span>
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-lg font-bold leading-tight">Unlock Unlimited AI Generations</h3>
                <p className="text-sm opacity-80">Upgrade to Pro for $9.99/mo and get exclusive algorithm insights.</p>
              </div>
              <button className="bg-white text-emerald-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors shadow-sm whitespace-nowrap">
                Upgrade Now
              </button>
            </div>
            {/* Decorative circles */}
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl"></div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">3. Generated Content</h2>
            {result && !result.isRaw && (
              <button 
                onClick={copyAll}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
              >
                {copiedAll ? <Check size={14} /> : <Copy size={14} />}
                {copiedAll ? 'Copied All' : 'Copy All Options'}
              </button>
            )}
          </div>

          <div className="min-h-[600px] relative">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {result.isRaw ? (
                    <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm prose prose-neutral max-w-none">
                      <div className="markdown-body">
                        <Markdown>{result.text}</Markdown>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      {result.captions?.map((caption, idx) => (
                        <CaptionCard key={idx} caption={caption} index={idx} />
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center gap-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-emerald-50 rounded-full"></div>
                    <div className="w-20 h-20 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin absolute top-0"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                      <Zap size={24} fill="currentColor" />
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">AI Strategist at work...</p>
                    <p className="text-sm text-neutral-400 mt-1 max-w-xs mx-auto">Analyzing image elements and optimizing for the {options.platform} algorithm.</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center text-neutral-300 gap-4 border-2 border-dashed border-neutral-200 rounded-3xl bg-white/50"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-neutral-100">
                    <Type size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-500">Ready to generate</p>
                    <p className="text-xs mt-1">Upload an image to see the magic happen.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}

function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-neutral-200 rounded-[40px] p-12 shadow-sm space-y-10"
      >
        <div className="space-y-4">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <ShieldCheck size={32} fill="currentColor" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-neutral-900">Terms of Service</h2>
          <p className="text-emerald-600 font-bold uppercase tracking-widest text-xs">Last Updated: March 2026</p>
        </div>

        <div className="prose prose-neutral max-w-none space-y-8">
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-neutral-900">1. Acceptance of Terms</h3>
            <p className="text-neutral-600 leading-relaxed">
              By accessing and using CaptionCrafter AI, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-neutral-900">2. Intellectual Property</h3>
            <p className="text-neutral-600 leading-relaxed">
              All content generated by the AI remains your property. However, the software, algorithms, and design of CaptionCrafter AI are protected by intellectual property laws.
            </p>
            <p className="text-neutral-900 font-bold italic">All Rights Reserved © 2026 CaptionCrafter AI.</p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-neutral-900">3. Usage Restrictions</h3>
            <p className="text-neutral-600 leading-relaxed">
              You agree not to use the service for any illegal purposes or to generate harmful, offensive, or misleading content. We reserve the right to terminate access for users who violate these guidelines.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-neutral-900">4. Disclaimer</h3>
            <p className="text-neutral-600 leading-relaxed italic">
              The captions generated are suggestions. We do not guarantee specific engagement results or social media performance.
            </p>
          </section>
        </div>

        <div className="pt-10 border-t border-neutral-100">
          <Link to="/" className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:gap-4 transition-all">
            <ArrowLeft size={20} /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
