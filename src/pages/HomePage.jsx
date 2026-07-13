import Hero from '../components/home/Hero'
import Features from '../components/home/Features'
import TrustSteps from '../components/home/TrustSteps'
import GalleryPreview from '../components/home/GalleryPreview'
import AuctionPreview from '../components/home/AuctionPreview'
import CTA from '../components/home/CTA'

export default function HomePage() {
  return (
    <div className="lp-root" style={{background: 'var(--primary)', color: 'var(--text)', minHeight: '100vh', fontFamily: "'Inter', sans-serif"}}>
      <Hero />
      <Features />
      <TrustSteps />
      <GalleryPreview />
      <AuctionPreview />
      <CTA />
    </div>
  )
}
