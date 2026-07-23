import { useState } from 'react';
import { MessageCircle, Phone, Mail, Clock, Send, HeadphonesIcon, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supportAPI } from '../api/api';
import { useFormValidation, validators } from '../hooks/useFormValidation';
import { FormField, FormTextarea, FormSelect } from '../components/ui/FormField';
import { useFocusTrap, useEscapeKey, useScrollLock } from '../hooks/useAccessibility';
import SEOHead from '../components/features/common/SEOHead';

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit: validateSubmit,
    resetForm,
  } = useFormValidation({
    category: {
      initialValue: 'general',
      rules: [validators.required('Please select a category')],
    },
    subject: {
      initialValue: '',
      rules: [
        validators.required('Subject is required'),
        validators.minLength(5, 'Subject must be at least 5 characters'),
      ],
    },
    message: {
      initialValue: '',
      rules: [
        validators.required('Message is required'),
        validators.minLength(20, 'Please provide more details (at least 20 characters)'),
      ],
    },
  });

  const handleSubmit = validateSubmit(async () => {
    setIsSubmitting(true);
    try {
      await supportAPI.create({
        subject: values.subject.trim(),
        message: values.message.trim(),
        category: values.category,
        email: user?.email,
        userId: user?._id || user?.id,
      });
      toast.success('Support ticket submitted successfully');
      setSubmitted(true);
      resetForm();
    } catch (error) {
      toast.error('Failed to submit support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  });

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
      
      <div className="min-h-screen bg-cream-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <HeadphonesIcon className="h-8 w-8 text-gold-600" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-charcoal-900">How can we help you?</h1>
            <p className="mt-2 text-warm-500">We're here to help with any questions or concerns</p>
          </div>

          {/* Contact Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <a 
              href="mailto:support@kayad.co.ke"
              className="bg-white rounded-xl p-6 border border-cream-200 hover:border-gold-500/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <Mail className="h-6 w-6 text-blue-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal-900">Email Support</h3>
                  <p className="text-sm text-warm-500">support@kayad.co.ke</p>
                </div>
              </div>
              <p className="text-sm text-warm-500">Response within 24 hours</p>
            </a>

            <a 
              href="tel:+254700123456"
              className="bg-white rounded-xl p-6 border border-cream-200 hover:border-gold-500/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                  <Phone className="h-6 w-6 text-green-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal-900">Phone Support</h3>
                  <p className="text-sm text-warm-500">+254 700 123 456</p>
                </div>
              </div>
              <p className="text-sm text-warm-500">Mon-Fri, 8am-6pm</p>
            </a>

            <button 
              onClick={() => setModalOpen(true)}
              className="bg-white rounded-xl p-6 border border-cream-200 hover:border-gold-500/50 hover:shadow-md transition-all text-left group"
              aria-label="Open live chat"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                  <MessageCircle className="h-6 w-6 text-purple-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal-900">Live Chat</h3>
                  <p className="text-sm text-warm-500">Chat with us</p>
                </div>
              </div>
              <p className="text-sm text-warm-500">Available 24/7</p>
            </button>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl border border-cream-200 p-6 md:p-8">
            <h2 className="text-xl font-serif font-bold text-charcoal-900 mb-6 flex items-center gap-2">
              <Send className="h-5 w-5 text-gold-600" aria-hidden="true" />
              Submit a Support Request
            </h2>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-600" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-serif font-bold text-charcoal-900 mb-2">Request Submitted!</h3>
                <p className="text-warm-500 mb-6">
                  Thank you for contacting us. Our team will respond within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-gold-600 hover:text-gold-700 font-semibold"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <FormSelect
                  label="Category"
                  name="category"
                  value={values.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  onBlur={() => handleBlur('category')}
                  error={touched.category ? errors.category : null}
                  required
                  options={categories}
                  placeholder="Select a category"
                />

                <FormField
                  label="Subject"
                  name="subject"
                  type="text"
                  value={values.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  onBlur={() => handleBlur('subject')}
                  error={touched.subject ? errors.subject : null}
                  placeholder="Brief description of your issue"
                  required
                  hint="Be specific to help us assist you faster"
                />

                <FormTextarea
                  label="Message"
                  name="message"
                  value={values.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  onBlur={() => handleBlur('message')}
                  error={touched.message ? errors.message : null}
                  placeholder="Please describe your issue in detail. Include any relevant order numbers, vehicle IDs, or screenshots if applicable..."
                  rows={6}
                  required
                />

                {!user && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4" role="alert">
                    <p className="text-sm text-amber-800">
                      <strong>Tip:</strong> For faster assistance, consider signing in to your account.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !isValid}
                  className="w-full py-3.5 bg-gold-500 text-charcoal-900 rounded-xl font-sans font-semibold 
                    hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed 
                    flex items-center justify-center gap-2 transition-colors"
                  aria-describedby={!isValid ? 'form-requirements' : undefined}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
                
                <p id="form-requirements" className="text-xs text-warm-400 text-center">
                  Fields marked with * are required
                </p>
              </form>
            )}
          </div>

          {/* Response Time */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-warm-500">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>Average response time: 4 hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Chat Modal (placeholder) */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-modal-title"
        >
          <div 
            className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 id="chat-modal-title" className="text-lg font-serif font-bold text-charcoal-900 mb-4">
              Live Chat
            </h2>
            <p className="text-warm-500 mb-6">
              Live chat coming soon! For immediate assistance, please call us or submit a support ticket.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2 px-4 border border-cream-300 rounded-xl font-sans font-semibold hover:bg-cream-50 transition-colors"
              >
                Close
              </button>
              <a
                href="tel:+254700123456"
                className="flex-1 py-2 px-4 bg-gold-500 text-charcoal-900 rounded-xl font-sans font-semibold hover:bg-gold-600 transition-colors text-center"
              >
                Call Us
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
