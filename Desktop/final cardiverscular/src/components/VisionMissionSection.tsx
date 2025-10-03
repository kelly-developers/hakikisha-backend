import { Button } from '@/components/ui/button';
import { Target, Eye } from 'lucide-react';
import { useScrollFadeIn } from '@/hooks/useScrollFadeIn';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export const VisionMissionSection = () => {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollFadeIn();

  return (
    <section id="vision-mission" className="py-20 bg-gradient-earth">
      <div className="container mx-auto px-6">
        <motion.div
          ref={sectionRef}
          className="grid lg:grid-cols-2 gap-12 items-center"
          initial={{ opacity: 0, y: 50 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          
          {/* Vision Card */}
          <motion.div
            className="feature-card group"
            initial={{ opacity: 0, x: -50 }}
            animate={sectionVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                <Eye className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-primary mb-4">Vision</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                An African Indigenous Knowledge Hub for the Advancement of African Scholarship 
                and Restoration of African Dignity.
              </p>
              <Button asChild variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <Link to="/vision-mission">View More</Link>
              </Button>
            </div>
          </motion.div>

          {/* Mission Card */}
          <motion.div
            className="feature-card group"
            initial={{ opacity: 0, x: 50 }}
            animate={sectionVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-warm rounded-full mb-6 group-hover:scale-110 transition-transform duration-300">
                <Target className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-primary mb-4">Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                To promote and support the contribution of African Indigenous Knowledge Systems 
                to the global pool of knowledge.
              </p>
              <Button asChild variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <Link to="/vision-mission">View More</Link>
              </Button>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};