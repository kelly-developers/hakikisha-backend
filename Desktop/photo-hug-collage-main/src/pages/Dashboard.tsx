import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Calendar,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Heart,
  Stethoscope,
  FileText,
  ArrowRight,
  Plus,
  Activity as Ekg,
  Shield,
  Zap
} from "lucide-react";
import dashboardBackground from '@/assets/dashboard-background.jpg';
import heroBackground from '@/assets/hero-cardiovascular.jpg';
import servicesBackground from '@/assets/services-cardiovascular.jpg';
import aboutBackground from '@/assets/about-cardiovascular.jpg';
import contactBackground from '@/assets/contact-cardiovascular.jpg';

export default function Dashboard() {
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const storedPatients = localStorage.getItem('cardiovascular-patients');
    const storedAppointments = localStorage.getItem('cardiovascular-appointments');
    const storedVitals = localStorage.getItem('cardiovascular-vitals');
    const storedPrescriptions = localStorage.getItem('cardiovascular-prescriptions');
    const storedNotifications = localStorage.getItem('cardiovascular-notifications');

    if (storedPatients) setPatients(JSON.parse(storedPatients));
    if (storedAppointments) setAppointments(JSON.parse(storedAppointments));
    if (storedVitals) setVitals(JSON.parse(storedVitals));
    if (storedPrescriptions) setPrescriptions(JSON.parse(storedPrescriptions));
    if (storedNotifications) setNotifications(JSON.parse(storedNotifications));
    
    setLoading(false);
  };

  const activeAppointments = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed');
  const criticalVitals = vitals.filter(v => v.riskLevel === 'critical' || v.riskLevel === 'high');
  const activePrescriptions = prescriptions.filter(p => p.status === 'active');
  const unreadNotifications = notifications.filter(n => !n.read);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Heart className="w-8 h-8 text-red-600 animate-pulse" />
            <span className="text-2xl font-bold text-gray-900">CardioCare+</span>
          </div>
          <div className="text-blue-700 font-medium">Loading Medical Dashboard...</div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Total Patients",
      value: patients.length.toString(),
      change: "+12%",
      icon: Users,
      color: "text-blue-800",
      bgColor: "from-blue-500 to-blue-600",
      bgImage: heroBackground
    },
    {
      title: "Active Appointments",
      value: activeAppointments.length.toString(),
      change: "+8%",
      icon: Calendar,
      color: "text-green-800",
      bgColor: "from-green-500 to-green-600",
      bgImage: servicesBackground
    },
    {
      title: "Critical Cases",
      value: criticalVitals.length.toString(),
      change: "-15%",
      icon: AlertTriangle,
      color: "text-red-800",
      bgColor: "from-red-500 to-red-600",
      bgImage: aboutBackground
    },
    {
      title: "Active Prescriptions",
      value: activePrescriptions.length.toString(),
      change: "+3%",
      icon: FileText,
      color: "text-purple-800",
      bgColor: "from-purple-500 to-purple-600",
      bgImage: contactBackground
    }
  ];

  const upcomingAppointments = appointments
    .filter(a => a.status === 'scheduled' || a.status === 'confirmed')
    .slice(0, 3)
    .map(a => ({
      patient: a.patientName,
      type: a.type,
      time: a.time,
      date: a.date,
      doctor: a.doctorName,
      status: a.status,
      priority: a.priority
    }));

  const recentActivity = [
    ...vitals.slice(0, 2).map(v => ({
      action: 'Vital signs recorded',
      patient: v.patientName,
      time: new Date(v.timestamp).toLocaleString(),
      status: v.riskLevel === 'critical' ? 'error' : v.riskLevel === 'high' ? 'warning' : 'success',
      icon: Ekg
    })),
    ...appointments.slice(0, 2).map(a => ({
      action: 'Appointment scheduled',
      patient: a.patientName,
      time: new Date(a.createdAt).toLocaleString(),
      status: 'info',
      icon: Calendar
    }))
  ].slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      {/* Professional Header Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-blue-600 to-green-600 z-50" />
      
      <div className="max-w-7xl mx-auto space-y-6 pt-2">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Heart className="w-7 h-7 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900 font-heading">
                CardioCare<span className="text-red-600">+</span>
              </h1>
            </div>
            <p className="text-base text-blue-800 font-medium max-w-2xl">
              Comprehensive cardiac care management platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-green-100 text-green-800 border border-green-300 px-3 py-1 text-xs font-semibold">
              <Activity className="w-3 h-3 mr-1" />
              System Online
            </Badge>
            <div className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded border border-blue-200">
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Stats Grid - Professional Medical Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-102 group">
              {/* Background Image with Professional Overlay */}
              <div className="absolute inset-0 z-0">
                <img 
                  src={stat.bgImage} 
                  alt={`${stat.title} Background`}
                  className="w-full h-full object-cover brightness-90 contrast-110 group-hover:brightness-95 transition-all duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} opacity-10`} />
                <div className="absolute inset-0 bg-white/20" />
              </div>
              
              {/* Content */}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10 p-4">
                <CardTitle className="text-sm font-semibold text-gray-900">
                  {stat.title}
                </CardTitle>
                <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 border border-gray-200">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10 p-4 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <p className="text-xs font-medium">
                  <span className={stat.change.startsWith('+') ? 'text-green-700' : 'text-red-700'}>
                    {stat.change}
                  </span>
                  <span className="text-gray-700 ml-1">from last month</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Appointments - Professional Card */}
          <Card className="border border-gray-200 shadow-md bg-white/90 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src={servicesBackground} 
                alt="Appointments Background"
                className="w-full h-full object-cover brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5" />
              <div className="absolute inset-0 bg-white/30" />
            </div>
            
            <CardHeader className="pb-4 relative z-10 p-5">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200">
                  <Calendar className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <div className="font-semibold text-base">Upcoming Appointments</div>
                  <CardDescription className="text-blue-800 font-medium text-sm">
                    Today's cardiac appointments
                  </CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3 relative z-10 p-5 pt-0">
              {upcomingAppointments.map((appointment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 group hover:bg-white">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-blue-800 transition-colors">
                        {appointment.patient}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-blue-700">{appointment.type}</div>
                    <div className="text-xs text-gray-600">
                      {appointment.date} at {appointment.time} • Dr. {appointment.doctor}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      className={`
                        text-xs font-semibold px-2 py-1 border
                        ${appointment.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800 border-green-300' 
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                        }
                      `}
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 text-sm border border-blue-500 hover:border-blue-600 transition-all duration-200 group">
                <span>View Full Schedule</span>
                <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity - Professional Card */}
          <Card className="border border-gray-200 shadow-md bg-white/90 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 z-0">
              <img 
                src={aboutBackground} 
                alt="Activity Background"
                className="w-full h-full object-cover brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/5" />
              <div className="absolute inset-0 bg-white/30" />
            </div>
            
            <CardHeader className="pb-4 relative z-10 p-5">
              <CardTitle className="flex items-center gap-3 text-gray-900">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center border border-green-200">
                  <Activity className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <div className="font-semibold text-base">Recent Activity</div>
                  <CardDescription className="text-green-800 font-medium text-sm">
                    Latest system updates
                  </CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3 relative z-10 p-5 pt-0">
              {recentActivity.map((activity, index) => {
                const StatusIcon = activity.icon;
                return (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white/80 rounded-lg border border-gray-200 hover:border-green-300 transition-all duration-200 group hover:bg-white">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'warning' ? 'bg-yellow-500' : 
                      activity.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <StatusIcon className="w-4 h-4 text-gray-500" />
                    <div className="flex-1 space-y-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-green-800 transition-colors">
                        {activity.action}
                      </div>
                      <div className="text-xs text-blue-700">Patient: {activity.patient}</div>
                    </div>
                    <div className="text-xs text-gray-500">{activity.time}</div>
                  </div>
                );
              })}
              
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 text-sm border border-green-500 hover:border-green-600 transition-all duration-200 group">
                <span>View All Activity</span>
                <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Department Performance - Professional Card */}
        <Card className="border border-gray-200 shadow-md bg-white/90 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={contactBackground} 
              alt="Performance Background"
              className="w-full h-full object-cover brightness-90 contrast-110"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/5" />
            <div className="absolute inset-0 bg-white/30" />
          </div>
          
          <CardHeader className="pb-4 relative z-10 p-5">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center border border-purple-200">
                <TrendingUp className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <div className="font-semibold text-base">Department Performance</div>
                <CardDescription className="text-purple-800 font-medium text-sm">
                  Key medical performance indicators
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="relative z-10 p-5 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3 p-4 bg-white/80 rounded-lg border border-gray-200 hover:border-green-300 transition-all duration-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">Surgery Success</span>
                  <span className="font-bold text-green-700">98.2%</span>
                </div>
                <Progress value={98.2} className="h-2 bg-gray-200" />
                <div className="text-xs text-green-700 font-medium">↑ 2.1% from last month</div>
              </div>
              
              <div className="space-y-3 p-4 bg-white/80 rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">Patient Satisfaction</span>
                  <span className="font-bold text-blue-700">96.8%</span>
                </div>
                <Progress value={96.8} className="h-2 bg-gray-200" />
                <div className="text-xs text-blue-700 font-medium">↑ 1.3% from last month</div>
              </div>
              
              <div className="space-y-3 p-4 bg-white/80 rounded-lg border border-gray-200 hover:border-purple-300 transition-all duration-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">WHO Compliance</span>
                  <span className="font-bold text-purple-700">100%</span>
                </div>
                <Progress value={100} className="h-2 bg-gray-200" />
                <div className="text-xs text-purple-700 font-medium">Perfect compliance</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Professional Card */}
        <Card className="border border-gray-200 shadow-md bg-white/90 backdrop-blur-sm overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src={dashboardBackground} 
              alt="Quick Actions Background"
              className="w-full h-full object-cover brightness-90 contrast-110"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-600/5" />
            <div className="absolute inset-0 bg-white/30" />
          </div>
          
          <CardHeader className="pb-4 relative z-10 p-5">
            <CardTitle className="flex items-center gap-3 text-gray-900">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center border border-red-200">
                <Zap className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <div className="font-semibold text-base">Quick Actions</div>
                <CardDescription className="text-red-800 font-medium text-sm">
                  Essential medical tools
                </CardDescription>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="relative z-10 p-5 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Users, label: "Add Patient", color: "blue" },
                { icon: Calendar, label: "Schedule Surgery", color: "green" },
                { icon: FileText, label: "Generate Report", color: "purple" },
                { icon: Stethoscope, label: "Emergency Protocol", color: "red" }
              ].map((action, index) => (
                <Button
                  key={index}
                  className={`
                    h-20 flex-col gap-2 font-semibold text-gray-900 border border-gray-200 
                    bg-white/80 hover:bg-white hover:scale-102 transition-all duration-200 group
                    ${action.color === 'blue' ? 'hover:border-blue-400' :
                      action.color === 'green' ? 'hover:border-green-400' :
                      action.color === 'purple' ? 'hover:border-purple-400' :
                      'hover:border-red-400'
                    }
                  `}
                  variant="outline"
                >
                  <action.icon className={`w-5 h-5 group-hover:scale-110 transition-transform duration-200 ${
                    action.color === 'blue' ? 'text-blue-700 group-hover:text-blue-800' :
                    action.color === 'green' ? 'text-green-700 group-hover:text-green-800' :
                    action.color === 'purple' ? 'text-purple-700 group-hover:text-purple-800' :
                    'text-red-700 group-hover:text-red-800'
                  }`} />
                  <span className="text-xs group-hover:translate-y-0.5 transition-transform text-center leading-tight">
                    {action.label}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}