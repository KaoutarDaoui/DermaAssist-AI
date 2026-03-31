import { useState } from "react";
import { Mail, Phone, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import NavBar from "../components/NavBar";
import Sidebar from "../components/Sidebar";

export default function ContactPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  const faqs = [
    {
      id: 1,
      question: "What is DermaAssist?",
      answer:
        "DermaAssist is an AI-powered dermatology diagnostic platform that helps doctors make informed decisions about skin conditions using advanced image analysis and clinical recommendations.",
    },
    {
      id: 2,
      question: "How do I use the platform?",
      answer:
        "Upload a patient's skin image, click 'Start Analysis', and the system will provide AI-powered diagnosis insights, confidence levels, clinical recommendations, and medication alerts.",
    },
    {
      id: 3,
      question: "Is my patient data secure?",
      answer:
        "Yes, all patient data is encrypted and stored securely on our HIPAA-compliant servers. We follow strict data protection protocols to ensure privacy.",
    },
    {
      id: 4,
      question: "What skin conditions can DermaAssist diagnose?",
      answer:
        "DermaAssist can diagnose a wide range of common dermatological conditions including acne, eczema, psoriasis, melanoma, and many other skin conditions. Our database includes 20+ conditions.",
    },
    {
      id: 5,
      question: "How accurate is the diagnosis?",
      answer:
        "DermaAssist provides confidence levels for each diagnosis. Results should be used as a clinical support tool, not as a replacement for professional medical judgment.",
    },
    {
      id: 6,
      question: "What image formats are supported?",
      answer:
        "We support common image formats including JPG, PNG, and JPEG. Images should be clear, well-lit, and show the affected area clearly.",
    },
    {
      id: 7,
      question: "How long does analysis take?",
      answer:
        "Analysis typically completes in seconds to minutes, depending on server load. You'll receive immediate feedback on the analysis results.",
    },
    {
      id: 8,
      question: "Is there a mobile app?",
      answer:
        "Currently, DermaAssist is available as a web application. Mobile app support is coming soon.",
    },
  ];

  const toggleFAQ = (id) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar open={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <NavBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex-1 overflow-auto">
          <div className="p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                Contact Us
              </h1>
              <p className="text-gray-600">
                Get in touch with DermaAssist or explore our frequently asked
                questions
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Contact Info Card */}
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Get in Touch
                </h2>

                <div className="space-y-6">
                  {/* Email */}
                  <div className="flex items-start gap-4">
                    <div className="bg-teal-100 p-3 rounded-lg">
                      <Mail className="w-6 h-6 text-[#0F6E56]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Email
                      </h3>
                      <a
                        href="mailto:contact@dermaassist.com"
                        className="text-[#0F6E56] hover:underline"
                      >
                        contact@dermaassist.com
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-4">
                    <div className="bg-teal-100 p-3 rounded-lg">
                      <Phone className="w-6 h-6 text-[#0F6E56]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Support
                      </h3>
                      <p className="text-gray-700">+213 662210203</p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-4">
                    <div className="bg-teal-100 p-3 rounded-lg">
                      <MapPin className="w-6 h-6 text-[#0F6E56]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        Address
                      </h3>
                      <p className="text-gray-700">
                        Babezzouar Cite Universitaire Alia
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Hours */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Business Hours
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Saturday - Thursday: 8:00 AM - 6:00 PM</p>
                    <p>Friday: Closed</p>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-br from-[#0F6E56] to-teal-700 rounded-lg shadow-md p-8 text-white">
                <h2 className="text-2xl font-bold mb-6">About DermaAssist</h2>
                <p className="mb-4">
                  DermaAssist is a cutting-edge AI-powered diagnostic platform
                  designed to assist dermatologists and healthcare professionals
                  in making accurate and informed decisions about skin health.
                </p>
                <p className="mb-4">
                  Our mission is to democratize access to expert dermatological
                  insights through advanced artificial intelligence and machine
                  learning technologies.
                </p>
                <p>
                  With over 20 recognized skin conditions and a comprehensive
                  knowledge base, DermaAssist provides confidence levels,
                  clinical recommendations, and personalized medication alerts.
                </p>

                <div className="mt-8 pt-8 border-t border-teal-600">
                  <h3 className="font-semibold mb-3">Response Time</h3>
                  <p className="text-teal-100">
                    We typically respond to inquiries within 24 hours during
                    business hours.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Frequently Asked Questions
              </h2>

              <div className="space-y-4">
                {faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-semibold text-gray-800 text-left">
                        {faq.question}
                      </span>
                      {expandedFAQ === faq.id ? (
                        <ChevronUp className="w-5 h-5 text-[#0F6E56]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#0F6E56]" />
                      )}
                    </button>

                    {expandedFAQ === faq.id && (
                      <div className="px-6 py-4 bg-white border-t border-gray-200">
                        <p className="text-gray-700 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
