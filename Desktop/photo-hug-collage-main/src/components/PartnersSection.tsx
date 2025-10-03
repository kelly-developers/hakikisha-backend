import { useState, useEffect } from 'react';

export const PartnersSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const partners = [
    { name: 'University of KwaZulu-Natal', logo: '/partners/ukzn.jpg' },
    { name: 'UNISA', logo: '/partners/unisa.png' },
    { name: 'University of Limpopo', logo: '/partners/ul.png' },
    { name: 'North-West University', logo: '/partners/nwu.png' },
    { name: 'University of Venda', logo: '/partners/univen.jpg' },
    { name: 'University of Namibia', logo: '/partners/unam.png' },
    { name: 'Makerere University', logo: '/partners/makerere.jpg' },
    { name: 'MUHAS', logo: '/partners/muhas.png' },
    { name: 'Eastern Mediterranean University', logo: '/partners/emu.png' },
    { name: 'University of Dar es Salaam', logo: '/partners/udsm.png' },
    { name: 'NIMR', logo: '/partners/nimr.jpg' },
    { name: 'ALMA', logo: '/partners/alma.jpg' },
    { name: 'Kisii University', logo: '/partners/kisii.jpg' },
    { name: 'MUST', logo: '/partners/must.jpg' },
    { name: 'University of Zambia', logo: '/partners/uzambia.png' },
    { name: 'University of Rwanda', logo: '/partners/ur.jpg' },
    { name: 'University of Bayreuth', logo: '/partners/ubayreuth.png' },
    { name: 'Centre for Indigenous Knowledge Systems', logo: '/partners/ciks.jpg' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % Math.ceil(partners.length / 6));
    }, 4000);

    return () => clearInterval(timer);
  }, [partners.length]);

  const visiblePartners = partners.slice(currentIndex * 6, (currentIndex + 1) * 6);

  return (
    <section className="py-16 bg-background border-t border-border">
      <div className="container mx-auto px-6">
        
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">Our Partners</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Collaborating with leading institutions across Africa and beyond to advance Indigenous Knowledge Systems
          </p>
        </div>

        {/* Partners Grid - Now with horizontal scrolling animation */}
        <div className="overflow-hidden">
          <div 
            className="flex gap-8 items-center animate-slide-left"
            style={{
              animation: 'slideLeft 30s linear infinite',
              width: `${partners.length * 200}px`
            }}
          >
            {partners.concat(partners).map((partner, index) => (
              <div 
                key={`${partner.name}-${index}`}
                className="flex-shrink-0 flex items-center justify-center p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                style={{ width: '180px' }}
              >
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-xs text-center text-muted-foreground font-medium leading-tight">
                    {partner.name.split(' ').map(word => word.charAt(0)).join('')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: Math.ceil(partners.length / 6) }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 animate-fade-in-up">
          <p className="text-sm text-muted-foreground">
            AIIKS is a consortium of more than 20 Higher Education Institutions and Research Centers
          </p>
        </div>

      </div>
    </section>
  );
};