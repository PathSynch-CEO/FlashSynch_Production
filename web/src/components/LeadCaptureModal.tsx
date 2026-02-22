import { useState } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { submitLeadCapture } from '../lib/api';
import type { LeadCaptureData } from '../types';

interface LeadCaptureModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  primaryColor: string;
}

export default function LeadCaptureModal({
  slug,
  isOpen,
  onClose,
  primaryColor,
}: LeadCaptureModalProps) {
  const [formData, setFormData] = useState<LeadCaptureData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    consent: false,
    channel: 'link_share',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.consent) {
      setError('Please agree to the privacy policy');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitLeadCapture(slug, formData);
      setIsSuccess(true);

      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          company: '',
          consent: false,
          channel: 'link_share',
        });
      }, 2000);
    } catch (err) {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-8">
          {isSuccess ? (
            <div className="text-center py-8">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <CheckCircle className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Thank you!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your information has been submitted successfully.
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Let's Connect
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Share your details and I'll get back to you soon.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name *"
                    value={formData.name}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Your email *"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone number (optional)"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    name="company"
                    placeholder="Company (optional)"
                    value={formData.company}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleChange}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to share my contact information and consent to being contacted. *
                  </span>
                </label>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
