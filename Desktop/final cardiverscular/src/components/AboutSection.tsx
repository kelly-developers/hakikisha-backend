import { Button } from '@/components/ui/button';
import aboutBackground from '@/assets/about-cardiovascular.jpg';

export const AboutSection = () => {
  return (
    <section id="about" className="py-20 relative overflow-hidden">
      {/* Background with cardiovascular image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={aboutBackground} 
          alt="Cardiovascular Background" 
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/92 to-background/95" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        
        {/* About Us Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h3 className="text-primary font-semibold text-lg mb-2">ABOUT US</h3>
          <h2 className="section-title">
            Cardiovascular Patient Management Platform
          </h2>
          <p className="section-subtitle">
            Advanced healthcare management system dedicated to comprehensive cardiovascular care,
            integrating patient records, surgical workflows, and cardiac treatment protocols.
          </p>
        </div>

        {/* What We Do Section */}
        <div className="text-center animate-fade-in-up">
          <h3 className="text-primary font-semibold text-lg mb-2">WHAT WE OFFER</h3>
          <h2 className="section-title mb-12">Comprehensive Cardiac Care System</h2>
          
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Our platform provides end-to-end cardiovascular patient management through 
            integrated digital workflows covering all aspects of cardiac care:
          </p>

          <div className="grid md:grid-cols-5 gap-4 mt-12">
            {[
              'Patient Registration & Vitals',
              'Doctor Analysis & Lab Tests', 
              'Prescription Management',
              'Surgical Care & Monitoring',
              'Follow-up & Data Export'
            ].map((pillar, index) => (
              <div 
                key={index}
                className={`p-6 bg-card rounded-lg shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-2 animate-fade-in-up stagger-${index + 1} border border-primary/10`}
              >
                <p className="font-semibold text-primary text-sm">{pillar}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};