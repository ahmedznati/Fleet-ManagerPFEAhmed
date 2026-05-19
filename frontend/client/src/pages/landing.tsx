import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Map, Smartphone, BarChart3, ArrowRight, Download, Check, Star, Crosshair } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export default function LandingPage() {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream font-sans">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-cream-50/90 backdrop-blur-md border-b border-gold-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="bg-gradient-to-br from-crimson-500 to-crimson-700 p-2 rounded-full shadow-lg shadow-crimson-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-gold-500 rounded-full border-2 border-cream-50"></div>
            </div>
            <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-crimson-600 to-crimson-800 bg-clip-text text-transparent">
              FleetGuard
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* PWA Install Button */}
            {isInstalled ? (
              <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 bg-emerald-50" disabled>
                <Check className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Installée</span>
              </Button>
            ) : isInstallable ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={installApp}
                className="text-gold-600 border-gold-300 hover:bg-gold-50"
              >
                <Download className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Installer l'App</span>
                <span className="sm:hidden">App</span>
              </Button>
            ) : null}
            
            <Link href="/login">
              <Button className="bg-gradient-to-r from-crimson-500 to-crimson-600 hover:from-crimson-600 hover:to-crimson-700 shadow-lg shadow-crimson-500/25 border-0">
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gold-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-crimson-400/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-gold-200/50 mb-8">
            <Star className="w-4 h-4 text-gold-500 fill-gold-500" />
            <span className="text-sm font-medium text-gray-700">Solution de confiance pour la gestion de flotte</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold text-gray-900 mb-6 tracking-tight leading-tight">
            Gestion de Flotte <br />
            <span className="bg-gradient-to-r from-crimson-500 via-crimson-600 to-crimson-700 bg-clip-text text-transparent">
              Intelligente & Sécurisée
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Suivez vos véhicules, gérez vos chauffeurs et optimisez vos itinéraires avec notre solution GPS de nouvelle génération.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-crimson-500 to-crimson-600 hover:from-crimson-600 hover:to-crimson-700 shadow-xl shadow-crimson-500/30 hover:scale-105 transition-all duration-300 border-0">
                Commencer Maintenant <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            
          </div>
          
          {/* Dashboard Preview with elegant frame */}
          <div className="mt-20 mx-auto max-w-5xl relative">
            {/* Decorative gold border */}
            <div className="absolute inset-0 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400 rounded-3xl transform rotate-1 opacity-60"></div>
            <div className="relative rounded-2xl bg-white shadow-2xl border-4 border-gold-200/50 p-4 transform hover:rotate-0 transition-transform duration-500 -rotate-1">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-cream-100 to-cream-200 flex items-center justify-center">
                <img 
                  src={`${import.meta.env.BASE_URL}emblem.png`}
                  alt="Emblème FleetGuard" 
                  className="object-contain h-64 md:h-80 drop-shadow-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-crimson-900/20 to-transparent" />
                {/* Overlay stats */}
               
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Une suite complète d'outils pour gérer efficacement votre flotte de véhicules
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-crimson-50 hover:to-white transition-all duration-300 border border-cream-300 hover:border-crimson-200 hover:shadow-xl hover:shadow-crimson-100">
              <div className="w-14 h-14 bg-gradient-to-br from-crimson-500 to-crimson-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-crimson-500/30 group-hover:scale-110 transition-transform">
                <Map className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">GPS en Temps Réel</h3>
              <p className="text-gray-600 leading-relaxed">Suivez chaque véhicule de votre flotte avec des mises à jour en direct et l'historique des trajets.</p>
            </div>
            
            <div className="group p-8 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-gold-50 hover:to-white transition-all duration-300 border border-cream-300 hover:border-gold-200 hover:shadow-xl hover:shadow-gold-100">
              <div className="w-14 h-14 bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-gold-500/30 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Analyses de Flotte</h3>
              <p className="text-gray-600 leading-relaxed">Surveillez le kilométrage et les performances des chauffeurs en temps réel.</p>
            </div>
            
            <div className="group p-8 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-crimson-50 hover:to-white transition-all duration-300 border border-cream-300 hover:border-crimson-200 hover:shadow-xl hover:shadow-crimson-100">
              <div className="w-14 h-14 bg-gradient-to-br from-crimson-500 to-crimson-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-crimson-500/30 group-hover:scale-110 transition-transform">
                <Smartphone className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">Compatible Mobile</h3>
              <p className="text-gray-600 leading-relaxed">Gérez votre flotte depuis n'importe où avec notre tableau de bord entièrement responsive.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="bg-gradient-to-br from-crimson-500 to-crimson-600 p-2 rounded-full">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-white text-xl">FleetGuard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-gold-500 fill-gold-500" />
              ))}
            </div>
            <span className="text-sm">Solution de confiance</span>
          </div>
          <p className="mt-4 md:mt-0">© 2026 FleetGuard. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
