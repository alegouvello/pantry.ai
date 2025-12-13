import { Settings as SettingsIcon, User, Building, Users, Bell, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="venue" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="venue" className="gap-2">
            <Building className="h-4 w-4" />
            Venue
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="venue">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Venue Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venueName">Venue Name</Label>
                  <Input
                    id="venueName"
                    defaultValue="The Golden Fork"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venueType">Venue Type</Label>
                  <Input
                    id="venueType"
                    defaultValue="Restaurant"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    defaultValue="America/New_York"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    defaultValue="USD"
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <Button variant="accent">Save Changes</Button>
            </CardContent>
          </Card>

          <Card variant="elevated" className="mt-6">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Storage Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['Walk-in Cooler', 'Dry Storage', 'Freezer', 'Bar'].map(
                (location) => (
                  <div
                    key={location}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <span className="text-foreground">{location}</span>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                )
              )}
              <Button variant="outline" className="w-full">
                Add Location
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card variant="elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Team Members
              </CardTitle>
              <Button variant="accent" size="sm">
                Invite Member
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'John Doe', role: 'Admin', email: 'john@example.com' },
                { name: 'Jane Smith', role: 'Manager', email: 'jane@example.com' },
                { name: 'Mike Chen', role: 'Chef', email: 'mike@example.com' },
              ].map((member) => (
                <div
                  key={member.email}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-accent flex items-center justify-center text-accent-foreground font-medium">
                      {member.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {member.role}
                    </span>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  title: 'Low Stock Alerts',
                  description: 'Get notified when items drop below reorder point',
                },
                {
                  title: 'Expiring Items',
                  description: 'Alerts for items approaching expiration',
                },
                {
                  title: 'Order Updates',
                  description: 'Notifications for PO status changes',
                },
                {
                  title: 'Daily Summary',
                  description: 'Morning digest of inventory status',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue="john@example.com"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    defaultValue="********"
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <Button variant="accent">Update Account</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
