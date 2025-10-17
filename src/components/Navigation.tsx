import { Link, useLocation } from "react-router-dom";
import { Trophy, Users, PlusCircle, BarChart3, MessageSquare, Table } from "lucide-react";

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { to: "/", label: "Dashboard", icon: Trophy },
    { to: "/teams", label: "Teams", icon: Users },
    { to: "/matches", label: "Match Entry", icon: PlusCircle },
    { to: "/standings", label: "Standings", icon: Table },
    { to: "/stats", label: "Stats", icon: BarChart3 },
    { to: "/chat", label: "AI Chat", icon: MessageSquare },
  ];

  return (
    <nav className="bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <Trophy className="h-6 w-6" />
            Office League Tracker
          </Link>
          
          <div className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;