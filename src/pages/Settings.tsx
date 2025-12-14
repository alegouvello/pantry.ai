import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Building, Users, Bell, MapPin, Cloud, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWeatherForecast, getWeatherIcon } from '@/hooks/useWeatherForecast';
import { BusinessHoursCard } from '@/components/settings/BusinessHoursCard';
import { ClosuresCard } from '@/components/settings/ClosuresCard';
import heroImage from '@/assets/pages/hero-settings.jpg';

interface RestaurantAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
};

export default function Settings() {
  const queryClient = useQueryClient();
  
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ['restaurant-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [venueName, setVenueName] = useState('');
  const [venueType, setVenueType] = useState('');
  const [timezone, setTimezone] = useState('');
  const [currency, setCurrency] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (restaurant) {
      setVenueName(restaurant.name || '');
      setVenueType(restaurant.concept_type || '');
      setTimezone(restaurant.timezone || 'America/New_York');
      setCurrency(restaurant.currency || 'USD');
      const address = restaurant.address as RestaurantAddress || {};
      setStreet(address.street || '');
      setCity(address.city || '');
      setState(address.state || '');
      setZip(address.zip || '');
      setCountry(address.country || 'USA');
    }
  }, [restaurant]);

  const { data: weatherPreview, isLoading: weatherLoading } = useWeatherForecast(
    city || undefined,
    undefined,
    undefined,
    3
  );

  const updateRestaurant = useMutation({
    mutationFn: async () => {
      if (!restaurant?.id) throw new Error('No restaurant found');
      
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: venueName,
          concept_type: venueType,
          timezone,
          currency,
          address: { street, city, state, zip, country },
        })
        .eq('id', restaurant.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-settings'] });
      queryClient.invalidateQueries({ queryKey: ['user-restaurant'] });
      queryClient.invalidateQueries({ queryKey: ['weather-forecast'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div 
        variants={itemVariants}
        className="relative h-48 md:h-56 rounded-2xl overflow-hidden"
      >
        <img 
          src={heroImage} 
          alt="Settings" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 md:px-12">
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
              Settings
            </h1>
            <p className="text-muted-foreground max-w-md">
              Manage your account and venue preferences.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="venue" className="space-y-6">
          <TabsList>
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

          <TabsContent value="venue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Venue Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {restaurantLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="venueName">Venue Name</Label>
                        <Input id="venueName" value={venueName} onChange={(e) => setVenueName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="venueType">Venue Type</Label>
                        <Input id="venueType" value={venueType} onChange={(e) => setVenueType(e.target.value)} placeholder="e.g., Restaurant, Cafe, Bar" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                      </div>
                    </div>
                    <Button variant="accent" onClick={() => updateRestaurant.mutate()} disabled={updateRestaurant.isPending}>
                      {updateRestaurant.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location & Weather
                </CardTitle>
                <CardDescription>Set your venue location for weather-based forecasting</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {restaurantLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Street Address</Label>
                        <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main Street" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State / Province</Label>
                        <Input id="state" value={state} onChange={(e) => setState(e.target.value)} placeholder="NY" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zip">ZIP / Postal Code</Label>
                        <Input id="zip" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="10001" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="USA" />
                      </div>
                    </div>

                    {city && (
                      <div className="rounded-lg border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Cloud className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Weather Preview for {city}</span>
                        </div>
                        {weatherLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading weather data...
                          </div>
                        ) : weatherPreview?.forecast?.length ? (
                          <div className="flex gap-4">
                            {weatherPreview.forecast.slice(0, 3).map((day) => (
                              <div key={day.date} className="text-center">
                                <div className="text-2xl">{getWeatherIcon(day.condition)}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </div>
                                <div className="text-sm font-medium">{Math.round(day.temp)}°F</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Unable to load weather.</p>
                        )}
                      </div>
                    )}

                    <Button variant="accent" onClick={() => updateRestaurant.mutate()} disabled={updateRestaurant.isPending}>
                      {updateRestaurant.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Location
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <BusinessHoursCard 
              restaurantId={restaurant?.id} 
              restaurantName={venueName}
              location={[city, state].filter(Boolean).join(', ')}
            />
            <ClosuresCard restaurantId={restaurant?.id} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Storage Locations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Walk-in Cooler', 'Dry Storage', 'Freezer', 'Bar'].map((location) => (
                  <div key={location} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-foreground">{location}</span>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full">Add Location</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-medium">Team Members</CardTitle>
                <Button variant="accent" size="sm">Invite Member</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'John Doe', role: 'Admin', email: 'john@example.com' },
                  { name: 'Jane Smith', role: 'Manager', email: 'jane@example.com' },
                  { name: 'Mike Chen', role: 'Chef', email: 'mike@example.com' },
                ].map((member) => (
                  <div key={member.email} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{member.role}</span>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { title: 'Low Stock Alerts', description: 'Get notified when items drop below reorder point' },
                  { title: 'Expiring Items', description: 'Alerts for items approaching expiration' },
                  { title: 'Order Updates', description: 'Notifications for PO status changes' },
                  { title: 'Daily Summary', description: 'Morning digest of inventory status' },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="you@example.com" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Button variant="outline">Change Password</Button>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
