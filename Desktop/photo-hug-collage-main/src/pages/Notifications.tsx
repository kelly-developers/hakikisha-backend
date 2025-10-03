import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, User, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: 'appointment' | 'surgery' | 'prescription' | 'emergency' | 'reminder';
  title: string;
  message: string;
  doctorId?: string;
  patientId?: string;
  appointmentId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: string;
  scheduledFor?: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
    // Simulate real-time notifications
    const interval = setInterval(checkForNewNotifications, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    const stored = localStorage.getItem('cardiovascular-notifications');
    if (stored) {
      setNotifications(JSON.parse(stored));
    } else {
      // Create some sample notifications
      const sampleNotifications: Notification[] = [
        {
          id: "1",
          type: 'appointment',
          title: 'Upcoming Appointment',
          message: 'John Doe has an appointment scheduled for tomorrow at 10:00 AM',
          priority: 'medium',
          read: false,
          createdAt: new Date().toISOString(),
          scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "2",
          type: 'emergency',
          title: 'Critical Vital Signs',
          message: 'Patient Mary Smith shows critical blood pressure readings (190/120)',
          priority: 'urgent',
          read: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "3",
          type: 'surgery',
          title: 'Surgery Consent Required',
          message: 'Patient Robert Johnson needs consent approval for cardiac surgery',
          priority: 'high',
          read: false,
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        }
      ];
      setNotifications(sampleNotifications);
      localStorage.setItem('cardiovascular-notifications', JSON.stringify(sampleNotifications));
    }
  };

  const checkForNewNotifications = () => {
    // Check for appointments due today
    const appointments = JSON.parse(localStorage.getItem('cardiovascular-appointments') || '[]');
    const today = new Date().toDateString();
    const todayAppointments = appointments.filter((apt: any) => 
      new Date(apt.date).toDateString() === today && apt.status === 'confirmed'
    );

    // Check for critical vitals
    const vitals = JSON.parse(localStorage.getItem('cardiovascular-vitals') || '[]');
    const recentCritical = vitals.filter((vital: any) => 
      vital.riskLevel === 'critical' && 
      new Date(vital.timestamp) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    const newNotifications = [];

    // Add appointment reminders
    todayAppointments.forEach((apt: any) => {
      const existingNotif = notifications.find(n => 
        n.type === 'reminder' && n.appointmentId === apt.id
      );
      if (!existingNotif) {
        newNotifications.push({
          id: `remind_${apt.id}`,
          type: 'reminder' as const,
          title: 'Appointment Reminder',
          message: `${apt.patientName} has an appointment today at ${apt.time}`,
          appointmentId: apt.id,
          priority: 'medium' as const,
          read: false,
          createdAt: new Date().toISOString(),
          scheduledFor: `${apt.date} ${apt.time}`
        });
      }
    });

    // Add critical vitals alerts
    recentCritical.forEach((vital: any) => {
      const existingNotif = notifications.find(n => 
        n.type === 'emergency' && n.message.includes(vital.patientName)
      );
      if (!existingNotif) {
        newNotifications.push({
          id: `critical_${vital.id}`,
          type: 'emergency' as const,
          title: 'Critical Vital Signs Alert',
          message: `${vital.patientName} shows critical readings: BP ${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}, HR ${vital.heartRate}`,
          patientId: vital.patientId,
          priority: 'urgent' as const,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    });

    if (newNotifications.length > 0) {
      const updatedNotifications = [...newNotifications, ...notifications];
      setNotifications(updatedNotifications);
      localStorage.setItem('cardiovascular-notifications', JSON.stringify(updatedNotifications));
      
      newNotifications.forEach(notif => {
        if (notif.priority === 'urgent') {
          toast({
            title: notif.title,
            description: notif.message,
            variant: "destructive",
          });
        }
      });
    }
  };

  const markAsRead = (notificationId: string) => {
    const updated = notifications.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    );
    setNotifications(updated);
    localStorage.setItem('cardiovascular-notifications', JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    const updated = notifications.map(notif => ({ ...notif, read: true }));
    setNotifications(updated);
    localStorage.setItem('cardiovascular-notifications', JSON.stringify(updated));
  };

  const deleteNotification = (notificationId: string) => {
    const updated = notifications.filter(notif => notif.id !== notificationId);
    setNotifications(updated);
    localStorage.setItem('cardiovascular-notifications', JSON.stringify(updated));
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'urgent':
        return notifications.filter(n => n.priority === 'urgent');
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment': return Calendar;
      case 'surgery': return FileText;
      case 'prescription': return FileText;
      case 'emergency': return AlertTriangle;
      case 'reminder': return Clock;
      default: return Bell;
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground">
              Doctor alerts, reminders, and system notifications
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50">
              {unreadCount} unread
            </Badge>
            {urgentCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {urgentCount} urgent
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Notifications
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === 'urgent' ? 'default' : 'outline'}
            onClick={() => setFilter('urgent')}
          >
            Urgent ({urgentCount})
          </Button>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            Mark All as Read
          </Button>
        )}
      </div>

      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Recent Notifications
          </CardTitle>
          <CardDescription>
            Stay updated with patient care alerts and reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {getFilteredNotifications().map((notification) => {
              const IconComponent = getNotificationIcon(notification.type);
              return (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg border transition-all ${
                    notification.read 
                      ? 'bg-background border-border' 
                      : 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      notification.priority === 'urgent' 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityBadgeColor(notification.priority)}>
                            {notification.priority.toUpperCase()}
                          </Badge>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground text-sm">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(notification.createdAt).toLocaleString()}</span>
                        {notification.scheduledFor && (
                          <span>Scheduled: {new Date(notification.scheduledFor).toLocaleString()}</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {getFilteredNotifications().length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No notifications to display</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}