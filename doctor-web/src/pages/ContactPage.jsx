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
      question: "Qu'est-ce que Skin+ ?",
      answer:
        "Skin+ est une plateforme de diagnostic dermatologique alimentee par l'IA qui aide les medecins a prendre des decisions eclairees sur les affections cutanees grace a une analyse d'image avancee et des recommandations cliniques.",
    },
    {
      id: 2,
      question: "Comment utiliser la plateforme ?",
      answer:
        "Televersez une image cutanee du patient, cliquez sur 'Demarrer l'analyse', et le systeme fournira des informations diagnostiques basees sur l'IA, des niveaux de confiance, des recommandations cliniques et des alertes medicamenteuses.",
    },
    {
      id: 3,
      question: "Les donnees de mes patients sont-elles securisees ?",
      answer:
        "Oui, toutes les donnees patient sont chiffrees et stockees de maniere securisee sur nos serveurs conformes HIPAA. Nous suivons des protocoles stricts de protection des donnees pour garantir la confidentialite.",
    },
    {
      id: 4,
      question: "Quelles affections cutanees Skin+ peut-il diagnostiquer ?",
      answer:
        "Skin+ peut diagnostiquer un large eventail d'affections dermatologiques courantes, notamment l'acne, l'eczema, le psoriasis, le melanome et bien d'autres. Notre base de donnees inclut plus de 20 affections.",
    },
    {
      id: 5,
      question: "Quelle est la precision du diagnostic ?",
      answer:
        "Skin+ fournit un niveau de confiance pour chaque diagnostic. Les resultats doivent etre utilises comme outil d'aide clinique, et non comme remplacement du jugement medical professionnel.",
    },
    {
      id: 6,
      question: "Quels formats d'image sont pris en charge ?",
      answer:
        "Nous prenons en charge les formats d'image courants, y compris JPG, PNG et JPEG. Les images doivent etre nettes, bien eclairees et montrer clairement la zone affectee.",
    },
    {
      id: 7,
      question: "Combien de temps prend l'analyse ?",
      answer:
        "L'analyse se termine generalement en quelques secondes a quelques minutes, selon la charge du serveur. Vous recevrez un retour rapide sur les resultats de l'analyse.",
    },
    {
      id: 8,
      question: "Existe-t-il une application mobile ?",
      answer:
        "Actuellement, Skin+ est disponible en application web. Le support de l'application mobile arrive bientot.",
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
                Contactez-nous
              </h1>
              <p className="text-gray-600">
                Entrez en contact avec Skin+ ou consultez nos questions
                frequentes
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Contact Info Card */}
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Nous contacter
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
                        href="mailto:contact@skinplus.com"
                        className="text-[#0F6E56] hover:underline"
                      >
                        contact@skinplus.com
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
                        Assistance
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
                        Adresse
                      </h3>
                      <p className="text-gray-700">
                        Bab Ezzouar Cite Universitaire Alia
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Hours */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Horaires d'ouverture
                  </h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>Samedi - Jeudi : 08:00 - 18:00</p>
                    <p>Vendredi : Ferme</p>
                  </div>
                </div>
              </div>

              {/* Info Card */}
              <div className="bg-gradient-to-br from-[#0F6E56] to-teal-700 rounded-lg shadow-md p-8 text-white">
                <h2 className="text-2xl font-bold mb-6">
                  A propos de Skin+
                </h2>
                <p className="mb-4">
                  Skin+ est une plateforme de diagnostic de nouvelle
                  generation basee sur l'IA, concue pour aider les dermatologues
                  et les professionnels de sante a prendre des decisions
                  precises et eclairees sur la sante de la peau.
                </p>
                <p className="mb-4">
                  Notre mission est de democratiser l'acces a des analyses
                  dermatologiques expertes grace a des technologies avancees
                  d'intelligence artificielle et de machine learning.
                </p>
                <p>
                  Avec plus de 20 affections cutanees reconnues et une base de
                  connaissances complete, Skin+ fournit des niveaux de
                  confiance, des recommandations cliniques et des alertes
                  medicamenteuses personnalisees.
                </p>

                <div className="mt-8 pt-8 border-t border-teal-600">
                  <h3 className="font-semibold mb-3">Delai de reponse</h3>
                  <p className="text-teal-100">
                    Nous repondons generalement aux demandes sous 24 heures
                    pendant les heures d'ouverture.
                  </p>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Questions frequentes
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
