import { Button } from '@/components/ui/button';
import { 
  Users, 
  Heart, 
  Activity, 
  FileText, 
  Calendar, 
  Stethoscope 
} from 'lucide-react';
import servicesBackground from '@/assets/services-cardiovascular.jpg';

export const ServicesSection = () => {
  const services = [
    {
      icon: Users,
      title: 'Patient Onboarding & Registration',
      description: 'Comprehensive patient registration system with complete demographic and medical history capture for cardiovascular patients...',
      href: '/patients'
    },
    {
      icon: Heart,
      title: 'Vital Signs Monitoring',
      description: 'Real-time collection and tracking of critical cardiovascular vital signs including blood pressure, heart rate, and oxygen levels...',
      href: '/vitals'
    },
    {
      icon: Stethoscope,
      title: 'Doctor Analysis & Diagnosis',
      description: 'Advanced diagnostic tools for cardiovascular assessment, treatment planning, and surgical recommendations...',
      href: '/analysis'
    },
    {
      icon: Activity,
      title: 'Laboratory Tests Management',
      description: 'Comprehensive lab test ordering and results management for cardiac biomarkers, imaging, and diagnostic procedures...',
      href: '/lab-tests'
    },
    {
      icon: FileText,
      title: 'Surgical Care Workflow',
      description: 'Complete surgical management from consent to post-operative care, including WHO checklists and real-time monitoring...',
      href: '/consent'
    },
    {
      icon: Calendar,
      title: 'Follow-up & Data Management',
      description: 'Patient follow-up scheduling, recovery tracking, and comprehensive data export capabilities for research and analysis...',
      href: '/followup'
    }
  ];

  return (
    <section id="services" className="py-20 relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={servicesBackground} 
          alt="Cardiovascular Services Background" 
          className="w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/90 to-background/95" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="section-title">Our Services & Features</h2>
          <p className="section-subtitle">
            Comprehensive cardiovascular patient management system designed for excellence in cardiac care
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div 
                key={index}
                className={`feature-card group animate-fade-in-up stagger-${(index % 4) + 1}`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-primary-glow transition-colors duration-300">
                      {service.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {service.description}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                    >
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};