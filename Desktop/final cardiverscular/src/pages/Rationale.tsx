import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useScrollFadeIn } from '@/hooks/useScrollFadeIn';
import { motion } from 'framer-motion';
import researchInnovation from '@/assets/research-innovation.jpg';

const Rationale = () => {
  const { ref: titleRef, isVisible: titleVisible } = useScrollFadeIn();
  const { ref: contentRef, isVisible: contentVisible } = useScrollFadeIn();

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 bg-gradient-warm">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={researchInnovation} 
            alt="Research and Innovation" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.h1
            ref={titleRef}
            className="text-5xl md:text-6xl font-bold text-white text-center mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            Rationale of AIIKS
          </motion.h1>
          <motion.p
            className="text-xl text-white/90 text-center max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={titleVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            The fundamental reasons behind establishing the African Institute for Indigenous Knowledge Systems
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
            <h2 className="text-3xl font-bold text-primary mb-6">Knowledge Preservation Crisis</h2>
            <p className="text-muted-foreground mb-6">
              African Indigenous Knowledge Systems face an unprecedented crisis of erosion and loss. With the passing of traditional knowledge holders and the influence of modernization, invaluable wisdom accumulated over millennia is disappearing at an alarming rate. AIIKS was established to urgently address this crisis through systematic documentation, preservation, and protection of these knowledge systems.
            </p>
            
            <h2 className="text-3xl font-bold text-primary mb-6">Decolonization of Knowledge</h2>
            <p className="text-muted-foreground mb-6">
              The colonial legacy has systematically marginalized and delegitimized Indigenous Knowledge Systems, positioning Western knowledge as superior. AIIKS serves as a critical instrument for decolonizing knowledge by validating, promoting, and integrating Indigenous Knowledge Systems into mainstream academic, policy, and development discourse.
            </p>
            
            <h2 className="text-3xl font-bold text-primary mb-6">Sustainable Development Imperative</h2>
            <p className="text-muted-foreground mb-6">
              Indigenous Knowledge Systems offer proven, sustainable solutions to contemporary challenges. From climate-resilient agricultural practices to holistic healthcare approaches, these systems provide alternatives that are environmentally sound, culturally appropriate, and economically viable. AIIKS facilitates the application of these solutions to address modern development challenges.
            </p>
            
            <h2 className="text-3xl font-bold text-primary mb-6">Cultural Identity and Dignity</h2>
            <p className="text-muted-foreground mb-6">
              The recognition and promotion of Indigenous Knowledge Systems is essential for restoring African cultural identity and dignity. AIIKS works to counter negative perceptions of African traditions and practices, fostering pride in indigenous heritage while demonstrating its contemporary relevance and value.
            </p>
            
            <h2 className="text-3xl font-bold text-primary mb-6">Innovation and Competitiveness</h2>
            <p className="text-muted-foreground">
              Indigenous Knowledge Systems represent untapped sources of innovation that can enhance Africa's competitiveness in the global knowledge economy. By developing and commercializing indigenous innovations, AIIKS contributes to economic development while ensuring that communities benefit from their traditional knowledge.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Rationale;