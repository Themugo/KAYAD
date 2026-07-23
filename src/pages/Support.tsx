import { useState } from 'react';
import { MessageCircle, Phone, Mail, Clock, Send, HeadphonesIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supportAPI } from '../api/api';
import SEOHead from '../components/features/common/SEOHead';

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !subject.trim()) return;

    setLoading(true);
    try {
      await supportAPI.create({
        subject: subject.trim(),
        message: message.trim(),
        category,
        email: user?.email,
        userId: user?._id || user?.id,
      });
      toast.success('Support ticket submitted successfully');
      setSubmitted(true);
      setMessage('');
      setSubject('');
    } catch (error) {
      toast.error('Failed to submit support ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'account', label: 'Account Related' },
    { value: 'listing', label: 'Listing Issue' },
    { value: 'payment', label: 'Payment/Escrow' },
    { value: 'feedback', label: 'Feedback/Suggestion' },
  ];

  return (
    <>
      <SEOHead 
        title="Support - KAYAD"
        description="Get help and support from the KAYAD team"
      />
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <HeadphonesIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">How can we help you?</h1>
            <p className="mt-2 text-gray-600">We're here to help with any questions or concerns</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Email Support</h3>
                  <p className="text-sm text-gray-600">support@kayad.co.ke</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Response within 24 hours</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Phone Support</h3>
                  <p className="text-sm text-gray-600">+254 700 123 456</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Mon-Fri, 8am-6pm</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-purple-100 rounded-full">
                  <MessageCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Live Chat</h3>
                  <p className="text-sm text-gray-600">Chat with us</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">Available 24/7</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit a Support Request
            </h2>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted!</h3>
                <p className="text-gray-600 mb-4">
                  Thank you for contacting us. We'll respond within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please describe your issue in detail..."
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                </div>

                {!user && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      Please note: For faster assistance, consider signing in to your account.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !message.trim() || !subject.trim()}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              <Clock className="h-4 w-4 inline mr-1" />
              Average response time: 4 hours
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
