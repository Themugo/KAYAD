import Hero from '../components/home/Hero'
import TrustBar from '../components/home/TrustBar'
import Features from '../components/home/Features'
import GalleryPreview from '../components/home/GalleryPreview'

export default function HomePage() {
  return (
    <div className="lp-root" style={{ background: 'var(--bg, #f8f9fa)', color: 'var(--text)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <Hero />
      <TrustBar />
      <Features />
      <GalleryPreview />
    </div>
  )
}
