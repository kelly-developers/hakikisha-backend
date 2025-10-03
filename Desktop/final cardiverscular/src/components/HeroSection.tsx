import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Eye, Target, Heart } from 'lucide-react';
import heroBackground from '@/assets/hero-cardiovascular.jpg';
import { FlyingBird } from './FlyingBird';
import { WaveBorder } from './WaveBorder';

export const HeroSection = () => {
  const scrollToNext = () => {
    const element = document.getElementById('about');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative min-h-screen overflow-hidden">
      {/* Cardiovascular Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBackground} 
          alt="Cardiovascular Care" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/90 to-background/85" />
      </div>

      {/* Large Background Text Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-5">
        <div className="flex items-center gap-4">
          <Heart className="w-20 h-20 md:w-32 md:h-32 text-primary/10" />
          <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-foreground/5 leading-none tracking-wider select-none">
            CARDIAC CARE
          </h1>
          <Heart className="w-20 h-20 md:w-32 md:h-32 text-primary/10" />
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-20 container mx-auto px-6 min-h-screen flex flex-col">
        
        {/* Top Content Area */}
        <div className="flex-1 flex items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-12 h-12 text-primary animate-pulse" />
              <Badge variant="outline" className="text-sm px-3 py-1">Advanced Cardiac Care</Badge>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Cardiovascular Patient
              <br />
              <span className="text-primary">Management Platform</span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              Comprehensive cardiovascular care management system designed to streamline patient care 
              from initial consultation through surgery and recovery. Delivering excellence in cardiac healthcare.
            </p>

            {/* Scroll Down Indicator */}
            <div className="flex items-center text-primary cursor-pointer" onClick={scrollToNext}>
              <div className="w-8 h-8 border-2 border-primary rounded-full flex items-center justify-center mr-3 animate-bounce">
                <ChevronDown className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Explore Our Services</span>
            </div>
          </div>
        </div>

        {/* Core Features - positioned at bottom */}
        <div className="pb-20">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Vision Card */}
            <div className="bg-card/90 backdrop-blur-sm rounded-lg p-8 shadow-xl text-center border border-border hover:shadow-2xl transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Eye className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Our Vision</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                To be the leading cardiovascular patient management platform, 
                revolutionizing cardiac care through innovative technology and 
                comprehensive patient-centered solutions.
              </p>
            </div>

            {/* Mission Card */}
            <div className="bg-card/90 backdrop-blur-sm rounded-lg p-8 shadow-xl text-center border border-border hover:shadow-2xl transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-4">Our Mission</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Delivering exceptional cardiovascular care through seamless patient 
                management, real-time monitoring, and evidence-based treatment protocols 
                to improve cardiac health outcomes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Flying Bird Animation */}
      <FlyingBird />
      
      {/* Wave Border */}
      <WaveBorder />
    </section>
  );
};