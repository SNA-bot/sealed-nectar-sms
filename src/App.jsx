import React, { useState, useEffect } from "react";
import { Menu, X, MapPin, ArrowRight, Star, BookOpen, GraduationCap, Users, Calendar, Image as ImageIcon } from "lucide-react";
import { getItem } from "./lib/storage";

function Rosette({ size = 20, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0 L14.5 8 L22 5.5 L16.5 12 L22 18.5 L14.5 16 L12 24 L9.5 16 L2 18.5 L7.5 12 L2 5.5 L9.5 8 Z" />
    </svg>
  );
}

const NAV_LINKS = [
  { id: "about", label: "About" },
  { id: "academics", label: "Academics" },
  { id: "news", label: "News" },
  { id: "gallery", label: "Gallery" },
  { id: "contact", label: "Contact" },
];
const PORTAL_URL = "https://sealed-nectar-sms.vercel.app";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [newsPosts, setNewsPosts] = useState([]);
  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [news, gallery] = await Promise.all([getItem("newsPosts"), getItem("galleryPhotos")]);
      setNewsPosts(Array.isArray(news) ? news : []);
      setGalleryPhotos(Array.isArray(gallery) ? gallery : []);
      setLoading(false);
    })();
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#1D2B26]">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-[#0B4F3C]/95 backdrop-blur text-[#FBF8F1] px-5 py-3 flex items-center justify-between shadow-md">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2">
          <Rosette size={18} className="text-[#C9A227]" />
          <span className="font-serif text-base">Sealed Nectar Academy</span>
        </button>
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <button key={l.id} onClick={() => scrollTo(l.id)} className="text-sm text-[#8FB5A5] hover:text-[#C9A227] transition-colors">{l.label}</button>
          ))}
          <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="text-sm bg-[#C9A227] text-[#0B4F3C] font-medium px-4 py-1.5 rounded-full hover:brightness-95 transition-all">Portal Login</a>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-[#FBF8F1]">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>
      {menuOpen && (
        <div className="md:hidden bg-[#0B4F3C] text-[#FBF8F1] px-5 py-4 flex flex-col gap-3 shadow-md">
          {NAV_LINKS.map((l) => (
            <button key={l.id} onClick={() => scrollTo(l.id)} className="text-left text-sm text-[#8FB5A5] hover:text-[#C9A227] py-1">{l.label}</button>
          ))}
          <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="text-sm bg-[#C9A227] text-[#0B4F3C] font-medium px-4 py-2 rounded-full text-center mt-1">Portal Login</a>
        </div>
      )}

      {/* Hero */}
      <header className="relative bg-[#0B4F3C] text-[#FBF8F1] px-5 py-20 text-center overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none" preserveAspectRatio="xMidYMid slice">
          <pattern id="stars" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M30 12 L33.5 24 L46 20 L37 30 L46 40 L33.5 36 L30 48 L26.5 36 L14 40 L23 30 L14 20 L26.5 24 Z" fill="#C9A227" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#stars)" />
        </svg>
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="flex justify-center gap-1 mb-4 text-[#C9A227]">
            <Rosette size={14} /><Rosette size={22} /><Rosette size={14} />
          </div>
          <p className="text-[#C9A227] text-xs tracking-[0.3em] uppercase mb-3">Bismillah</p>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight mb-4">Sealed Nectar Academy</h1>
          <p className="text-[#8FB5A5] text-lg mb-1">Guided by Faith, Driven by Excellence</p>
          <p className="text-[#8FB5A5] text-sm mb-8">Ota, Ogun State, Nigeria · KG — SS3</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => scrollTo("about")} className="flex items-center gap-2 bg-[#C9A227] text-[#0B4F3C] font-medium px-6 py-3 rounded-full hover:brightness-95 transition-all">
              Learn More <ArrowRight size={16} />
            </button>
            <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-[#C9A227]/50 text-[#FBF8F1] px-6 py-3 rounded-full hover:bg-white/5 transition-colors">
              Parent &amp; Staff Portal
            </a>
          </div>
        </div>
      </header>

      {/* About */}
      <section id="about" className="px-5 py-16 max-w-3xl mx-auto scroll-mt-16">
        <SectionHeading title="About Us" />
        <p className="text-[#1D2B26] leading-relaxed mb-4">
          Sealed Nectar Academy is an Islamic-values school in Ota, Ogun State, offering a full Nigerian
          curriculum from Kindergarten through Senior Secondary School. We are committed to raising
          children who excel academically while staying firmly grounded in their faith and character —
          <span className="italic"> despite all odds, guided by faith, driven by success.</span>
        </p>
        <p className="text-[#1D2B26] leading-relaxed">
          Our classrooms blend rigorous academics with strong moral upbringing, small class sizes, and a
          genuine sense of community between staff, students, and parents.
        </p>
        <div className="grid grid-cols-3 gap-3 mt-8">
          <StatCard icon={<Users size={18} />} label="KG — SS3" />
          <StatCard icon={<BookOpen size={18} />} label="Full Curriculum" />
          <StatCard icon={<GraduationCap size={18} />} label="Islamic Values" />
        </div>
      </section>

      {/* Academics */}
      <section id="academics" className="px-5 py-16 bg-[#F5F1E6] scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <SectionHeading title="Academics" />
          <div className="grid sm:grid-cols-2 gap-4">
            <AcademicCard title="Early Years" range="KG1 – Nursery 2" desc="Foundational learning through play, literacy, numeracy, and Islamic studies." />
            <AcademicCard title="Primary" range="Basic 1 – Basic 5" desc="Core subjects, English, Mathematics, Arabiyah, ICT, and creative arts." />
            <AcademicCard title="Junior Secondary" range="JSS1 – JSS3" desc="Broad-based curriculum preparing students for specialisation at senior level." />
            <AcademicCard title="Senior Secondary" range="SS1 – SS3" desc="STEM, Business, and Humanities departments, plus a compulsory trade subject." />
          </div>
        </div>
      </section>

      {/* News */}
      <section id="news" className="px-5 py-16 max-w-3xl mx-auto scroll-mt-16">
        <SectionHeading title="News & Events" />
        {loading ? (
          <p className="text-sm text-[#6E8F80]">Loading…</p>
        ) : newsPosts.length === 0 ? (
          <EmptyBlock icon={<Calendar size={22} />} text="No news posted yet — check back soon." />
        ) : (
          <div className="space-y-4">
            {[...newsPosts].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((p) => (
              <article key={p.id} className="bg-white border border-[#EFE9DA] rounded-xl overflow-hidden flex flex-col sm:flex-row">
                {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full sm:w-40 h-40 object-cover flex-shrink-0" />}
                <div className="p-5">
                  <p className="text-xs text-[#C9A227] uppercase tracking-wide mb-1">{p.date}</p>
                  <h3 className="font-serif text-lg text-[#0B4F3C] mb-2">{p.title}</h3>
                  <p className="text-sm text-[#1D2B26] leading-relaxed whitespace-pre-wrap">{p.content}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Gallery */}
      <section id="gallery" className="px-5 py-16 bg-[#F5F1E6] scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <SectionHeading title="Gallery" />
          {loading ? (
            <p className="text-sm text-[#6E8F80]">Loading…</p>
          ) : galleryPhotos.length === 0 ? (
            <EmptyBlock icon={<ImageIcon size={22} />} text="Photos from school activities will appear here soon." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...galleryPhotos].reverse().map((p) => (
                <div key={p.id} className="group relative rounded-lg overflow-hidden border border-[#EFE9DA]">
                  <img src={p.url} alt={p.caption || ""} className="w-full aspect-square object-cover" />
                  {p.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                      <p className="text-[10px] text-white truncate">{p.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="px-5 py-16 max-w-2xl mx-auto text-center scroll-mt-16">
        <SectionHeading title="Contact Us" center />
        <div className="inline-flex items-center gap-2 text-[#1D2B26] bg-white border border-[#EFE9DA] rounded-full px-5 py-3">
          <MapPin size={16} className="text-[#C9A227]" />
          <span className="text-sm">Ota, Ogun State, Nigeria</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B4F3C] text-[#8FB5A5] px-5 py-8 text-center text-sm">
        <div className="flex justify-center gap-1 mb-3 text-[#C9A227]"><Rosette size={14} /></div>
        <p>© {new Date().getFullYear()} Sealed Nectar Academy. All rights reserved.</p>
        <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-[#C9A227] hover:underline">Parent &amp; Staff Portal →</a>
      </footer>
    </div>
  );
}

function SectionHeading({ title, center }) {
  return (
    <h2 className={`font-serif text-2xl text-[#0B4F3C] mb-6 flex items-center gap-2 ${center ? "justify-center" : ""}`}>
      <span className="w-1.5 h-6 bg-[#C9A227] rounded-full inline-block" />
      {title}
    </h2>
  );
}

function StatCard({ icon, label }) {
  return (
    <div className="bg-white border border-[#EFE9DA] rounded-lg p-4 flex flex-col items-center gap-2 text-center">
      <span className="text-[#C9A227]">{icon}</span>
      <span className="text-xs text-[#1D2B26] font-medium">{label}</span>
    </div>
  );
}

function AcademicCard({ title, range, desc }) {
  return (
    <div className="bg-white border border-[#EFE9DA] rounded-xl p-5">
      <p className="font-serif text-lg text-[#0B4F3C] mb-0.5">{title}</p>
      <p className="text-xs text-[#C9A227] uppercase tracking-wide mb-2">{range}</p>
      <p className="text-sm text-[#6E8F80] leading-relaxed">{desc}</p>
    </div>
  );
}

function EmptyBlock({ icon, text }) {
  return (
    <div className="border border-dashed border-[#C9A227]/40 rounded-xl py-12 flex flex-col items-center gap-3 text-[#6E8F80]">
      <span className="text-[#C9A227]">{icon}</span>
      <p className="text-sm">{text}</p>
    </div>
  );
}
