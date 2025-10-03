import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

export const ObjectivesSection = () => {
  const objectives = [
    'To establish a continental Institute on Indigenous Knowledge Systems in Africa, building on the already existing national, regional and continental IKS instruments and imperatives',
    'To work towards the Institute being recognized as a UNESCO Category II Centre',
    'To generate AIKS-based knowledge products, services and impacts for uptake by national governments, international organizations and development agencies',
    'To build a self-reliant and financially sustainable Institute by strengthening and diversifying its sources of Third and Fourth Income Streams'
  ];

  return (
    <section id="objectives" className="py-20 bg-background">
      <div className="container mx-auto px-6">
        
        <div className="text-center mb-16 animate-fade-in-up">
          <h3 className="text-primary font-semibold text-lg mb-2">WHY US</h3>
          <h2 className="section-title">Specific Objectives</h2>
          <p className="section-subtitle">
            Our strategic objectives guide our mission to advance African Indigenous Knowledge Systems
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {objectives.map((objective, index) => (
            <div 
              key={index}
              className={`flex items-start space-x-4 mb-8 p-6 bg-card rounded-xl shadow-card hover:shadow-elegant transition-all duration-300 animate-slide-in-left stagger-${index + 1}`}
            >
              <div className="flex-shrink-0 mt-1">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-lg text-foreground leading-relaxed">
                  {objective}
                </p>
              </div>
              <div className="flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 animate-fade-in-up">
          <Button 
            size="lg"
            className="bg-gradient-primary hover:shadow-elegant transition-all duration-300 px-8"
          >
            Read more about our Vision, Mission & Objectives
          </Button>
        </div>

      </div>
    </section>
  );
};