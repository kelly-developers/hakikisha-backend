import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Microscope, 
  Building2, 
  CheckCircle,
  ArrowRight
} from "lucide-react";

interface ProjectSetupDialogProps {
  open: boolean;
  onComplete: (projectType: string) => void;
}

export function ProjectSetupDialog({ open, onComplete }: ProjectSetupDialogProps) {
  const [selectedType, setSelectedType] = useState<string>("");

  const projectTypes = [
    {
      id: "fun",
      title: "Personal/Learning",
      description: "Exploring the system or learning about surgery management",
      icon: Zap,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      features: ["Demo data included", "Full feature access", "No compliance requirements"]
    },
    {
      id: "research", 
      title: "Research Project",
      description: "Academic research or clinical studies",
      icon: Microscope,
      color: "text-primary",
      bgColor: "bg-primary/5",
      features: ["Data export tools", "Analytics dashboard", "Research compliance"]
    },
    {
      id: "production",
      title: "Production Use",
      description: "Live healthcare facility deployment",
      icon: Building2,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20", 
      features: ["HIPAA compliance", "Audit trails", "Advanced security"]
    }
  ];

  const handleContinue = () => {
    if (selectedType) {
      onComplete(selectedType);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-medical rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Welcome to AIAA-NGO Surgery Management</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Let's set up your project based on your intended use case
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {projectTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <Card 
                  key={type.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'ring-2 ring-primary shadow-medical border-primary/20' 
                      : 'hover:shadow-card hover:border-primary/20'
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-lg ${type.bgColor} flex items-center justify-center mb-3`}>
                        <Icon className={`w-6 h-6 ${type.color}`} />
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <CardTitle className="text-lg">{type.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {type.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {type.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-success" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedType && (
            <div className="bg-accent/50 border border-accent rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5">
                  <CheckCircle className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-accent-foreground mb-1">
                    {projectTypes.find(t => t.id === selectedType)?.title} Selected
                  </h3>
                  <p className="text-sm text-accent-foreground/80">
                    {selectedType === 'fun' && "You'll have access to all features with demo data to explore the system safely."}
                    {selectedType === 'research' && "Research tools and compliance features will be enabled for your academic work."}
                    {selectedType === 'production' && "Enterprise security and compliance features will be activated for live patient data."}
                  </p>
                  {selectedType === 'production' && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      HIPAA Compliant
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              You can change this setting later in project preferences
            </p>
            <Button 
              onClick={handleContinue}
              disabled={!selectedType}
              className="bg-gradient-medical text-white"
            >
              Continue Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}