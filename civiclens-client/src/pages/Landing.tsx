import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, Shield, TrendingUp, MapPin, CheckCircle2, Clock } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CivicLens</h1>
              <p className="text-xs text-muted-foreground">Report. Track. Resolve.</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Making cities better, together
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Make Your City Better,<br />
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              One Report at a Time
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Report civic issues instantly, track their progress in real-time, and watch your community transform.
          </p>

          {/* Portal Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary group"
                  onClick={() => navigate('/citizen/login')}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Citizen Portal</h3>
              <p className="text-muted-foreground mb-6">Report issues, track progress, and help improve your community</p>
              <Button className="w-full" size="lg">
                Login / Sign Up
              </Button>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-secondary group"
                  onClick={() => navigate('/officer/login')}>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Officer Portal</h3>
              <p className="text-muted-foreground mb-6">Manage tasks, resolve issues, and serve the community</p>
              <Button variant="secondary" className="w-full" size="lg">
                Officer Login
              </Button>
            </Card>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { label: "Reports Submitted", value: "12,450+", icon: TrendingUp },
            { label: "Issues Resolved", value: "10,230+", icon: CheckCircle2 },
            { label: "Active Officers", value: "250+", icon: Shield },
            { label: "Avg. Resolution Time", value: "2.5 days", icon: Clock },
          ].map((stat, idx) => (
            <Card key={idx} className="p-6 text-center hover:shadow-md transition-all">
              <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
            How CivicLens Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Report an Issue",
                description: "Spot a problem? Take a photo, add location, and submit your report in seconds.",
                color: "from-primary to-accent"
              },
              {
                step: "02",
                title: "Track Progress",
                description: "Watch as your report is assigned, acknowledged, and resolved in real-time.",
                color: "from-accent to-secondary"
              },
              {
                step: "03",
                title: "See the Change",
                description: "Get notified when the issue is resolved. Rate the service and earn reputation points.",
                color: "from-secondary to-primary"
              }
            ].map((item, idx) => (
              <Card key={idx} className="p-8 relative overflow-hidden group hover:shadow-lg transition-all">
                <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${item.color} opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
                <div className="text-6xl font-bold text-primary/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>© 2025 CivicLens. All rights reserved.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact Us</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
