import { useParams } from 'react-router-dom';
import { MapPin, Star, Phone, Mail, Shield, Award, Clock } from 'lucide-react';
import SEOHead from '../components/features/common/SEOHead';

export default function DealerProfile() {
  const { id } = useParams();

  return (
    <>
      <SEOHead 
        title="Dealer Profile - KAYAD"
        description="View dealer profile on KAYAD"
      />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-800"></div>
            <div className="px-6 pb-6">
              <div className="flex items-start justify-between -mt-12 mb-4">
                <div className="bg-gray-200 border-4 border-white rounded-full w-24 h-24 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-400">D</span>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Contact Dealer
                  </button>
                </div>
              </div>

              <h1 className="text-2xl font-bold text-gray-900">Dealer Profile</h1>
              <p className="text-gray-600">ID: {id}</p>

              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">4.8</span>
                  <span className="text-gray-600">(124 reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span>Verified Dealer</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="h-5 w-5" />
                  <span>Nairobi, Kenya</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock className="h-5 w-5" />
                  <span>Member since 2022</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Award className="h-5 w-5" />
                  <span>Top Rated Seller 2024</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h2 className="text-lg font-semibold mb-4">About</h2>
                <p className="text-gray-600">
                  This dealer profile page is under construction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
