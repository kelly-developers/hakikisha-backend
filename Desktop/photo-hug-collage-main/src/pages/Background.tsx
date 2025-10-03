import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useScrollFadeIn } from '@/hooks/useScrollFadeIn';
import { motion } from 'framer-motion';
import backgroundImage from '@/assets/about-cardiovascular.jpg';

const Background = () => {
  const { ref: titleRef, isVisible: titleVisible } = useScrollFadeIn();
  const { ref: contentRef, isVisible: contentVisible } = useScrollFadeIn();

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={backgroundImage} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.h1
            ref={titleRef}
            className="text-5xl md:text-6xl font-bold text-white text-center mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            Background
          </motion.h1>
          <motion.p
            className="text-xl text-white/90 text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Understanding the foundation and context of AIIKS
          </motion.p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            ref={contentRef}
            className="prose prose-lg max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={contentVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-primary mb-6">Historical Context</h2>
            <p className="text-muted-foreground mb-6">
              The African Institute for Indigenous Knowledge Systems (AIIKS) was established to address the critical need for preserving, protecting, and promoting African Indigenous Knowledge Systems (IKS). This initiative stems from the recognition that traditional knowledge systems have been marginalized and undervalued in mainstream academic and development discourse.
            </p>
            
            <h2 className="text-3xl font-bold text-primary mb-6">The Need for AIIKS</h2>
            <p className="text-muted-foreground mb-6">
              Indigenous Knowledge Systems represent centuries of accumulated wisdom, practices, and innovations developed by African communities. These systems encompass traditional medicine, agriculture, environmental management, governance structures, and cultural practices that have sustained communities for generations.
            </p>
            
            <h2 className="text-3xl font-bold text-primary mb-6">Institutional Foundation</h2>
            <p className="text-muted-foreground mb-6">
              AIIKS is established as a Category II Centre under the auspices of UNESCO, positioning it as a significant player in the global knowledge ecosystem. This status provides the institute with international recognition and support for its mission to advance Indigenous Knowledge Systems.
            </p>
            
            <h2 className="text-3xl font-bold text-primary mb-6">Contemporary Relevance</h2>
            <p className="text-muted-foreground">
              In today's rapidly changing world, Indigenous Knowledge Systems offer valuable insights for addressing contemporary challenges such as climate change, sustainable development, healthcare, and social cohesion. AIIKS serves as a bridge between traditional wisdom and modern science, facilitating dialogue and collaboration between different knowledge systems.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Background;