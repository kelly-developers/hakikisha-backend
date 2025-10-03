import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useScrollFadeIn } from '@/hooks/useScrollFadeIn';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, Award, BookOpen } from 'lucide-react';

const Governance = () => {
  const { ref: titleRef, isVisible: titleVisible } = useScrollFadeIn();
  const { ref: structureRef, isVisible: structureVisible } = useScrollFadeIn();

  const governanceStructure = [
    {
      title: "Board of Directors",
      icon: Shield,
      description: "Strategic oversight and policy direction",
      members: ["Chairperson", "Vice-Chairperson", "Academic Director", "Community Representatives"]
    },
    {
      title: "Academic Council",
      icon: BookOpen,
      description: "Academic standards and research direction",
      members: ["Senior Researchers", "External Experts", "UNESCO Representatives", "Student Representatives"]
    },
    {
      title: "Community Advisory Panel",
      icon: Users,
      description: "Community engagement and traditional knowledge validation",
      members: ["Traditional Leaders", "Knowledge Holders", "Community Elders", "Cultural Practitioners"]
    },
    {
      title: "International Advisory Board",
      icon: Award,
      description: "Global partnerships and international standards",
      members: ["International Experts", "Partner Institution Representatives", "UNESCO Officials", "Donor Representatives"]
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 bg-gradient-earth">
        <div className="container mx-auto px-6 relative z-10">
          <motion.h1
            ref={titleRef}
            className="text-5xl md:text-6xl font-bold text-primary text-center mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            Governance Structure
          </motion.h1>
          <motion.p
            className="text-xl text-muted-foreground text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Ensuring accountability, transparency, and effective leadership in AIIKS operations
          </motion.p>
        </div>
      </section>

      {/* Governance Structure */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            ref={structureRef}
            initial={{ opacity: 0, y: 30 }}
            animate={structureVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="section-title mb-12">Organizational Structure</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {governanceStructure.map((structure, index) => {
                const IconComponent = structure.icon;
                return (
                  <motion.div
                    key={structure.title}
                    initial={{ opacity: 0, y: 30 }}
                    animate={structureVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  >
                    <Card className="feature-card h-full">
                      <CardHeader className="text-center">
                        <IconComponent className="w-12 h-12 text-primary mx-auto mb-4" />
                        <CardTitle className="text-2xl text-primary">{structure.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">{structure.description}</p>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-foreground">Key Members:</h4>
                          {structure.members.map((member) => (
                            <div key={member} className="text-sm text-muted-foreground flex items-center">
                              <div className="w-1 h-1 bg-primary rounded-full mr-2"></div>
                              {member}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Governance Principles */}
          <motion.div
            className="mt-16"
            initial={{ opacity: 0, y: 30 }}
            animate={structureVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card className="feature-card">
              <CardHeader className="text-center">
                <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
                <CardTitle className="text-3xl text-primary">Governance Principles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-semibold text-primary mb-3">Transparency</h4>
                    <p className="text-muted-foreground text-sm mb-4">
                      All decisions, processes, and operations are conducted with full transparency 
                      and accountability to stakeholders and communities.
                    </p>
                    <h4 className="font-semibold text-primary mb-3">Inclusivity</h4>
                    <p className="text-muted-foreground text-sm">
                      Diverse representation ensuring all voices, particularly those of indigenous 
                      communities, are heard and valued in decision-making processes.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary mb-3">Cultural Sensitivity</h4>
                    <p className="text-muted-foreground text-sm mb-4">
                      Governance structures respect and incorporate traditional African governance 
                      systems and cultural protocols.
                    </p>
                    <h4 className="font-semibold text-primary mb-3">Ethical Standards</h4>
                    <p className="text-muted-foreground text-sm">
                      Adherence to the highest ethical standards in research, community engagement, 
                      and knowledge management practices.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Governance;