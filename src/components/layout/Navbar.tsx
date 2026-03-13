import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  Search, 
  MapPin, 
  Menu, 
  ShoppingCart, 
  User, 
  ChevronDown,
  Store,
  HelpCircle,
  Heart,
  CalendarDays,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore, useAuthStore, useSearchStore, useLocationStore, useThemeStore, useRentalDatesStore } from "@/stores";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const categories = [
  { name: "Camera & Gear", icon: "📷", sub: ["DSLR", "Lenses", "Tripods", "Drones"] },
  { name: "Laptops & PCs", icon: "💻", sub: ["Gaming", "MacBooks", "Workstations"] },
  { name: "Gaming", icon: "🎮", sub: ["Consoles", "VR Headsets", "Controllers"] },
  { name: "Audio", icon: "🎧", sub: ["Speakers", "Mics", "Headphones"] },
  { name: "Projectors", icon: "📽️", sub: ["4K", "Portable", "Screens"] },
  { name: "Camping", icon: "⛺", sub: ["Tents", "Power Stations", "Lights"] },
];

export function Navbar() {
  const [tempLocation, setTempLocation] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [rentalPopoverOpen, setRentalPopoverOpen] = useState(false);

  // Zustand stores
  const cartItemCount = useCartStore(state => state.getItemCount());
  const { user, isAuthenticated, logout } = useAuthStore();
  const { query, setQuery, addToRecentSearches } = useSearchStore();
  const { location, setLocation } = useLocationStore();
  const { theme, toggleTheme } = useThemeStore();
  const { startDate: rentalStartDate, endDate: rentalEndDate, setStartDate, setEndDate, setDates, getDays } = useRentalDatesStore();
  
  // Apply theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  const handleLocationChange = () => {
    if (tempLocation.trim()) {
      setLocation(tempLocation);
      console.log("📍 Location changed to:", tempLocation);
      alert(`Location updated to: ${tempLocation}`);
    }
  };
  
  const handleRentalDatesApply = () => {
    if (rentalStartDate && rentalEndDate) {
      setDates(rentalStartDate, rentalEndDate);
      setRentalPopoverOpen(false);
      console.log("📅 Rental period set:", {
        startDate: rentalStartDate,
        endDate: rentalEndDate,
        days: getDays(),
      });
    }
  };

  return (
    <>
      {/* Main Navbar */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 shadow-sm border-b border-purple-100/20 dark:border-slate-700 transition-colors">
        <div className="bg-primary dark:bg-purple-900 text-primary-foreground text-[11px] py-1.5 px-4 hidden md:flex justify-between items-center tracking-wide">
          <div className="flex gap-6">
             <span className="opacity-90 hover:opacity-100 cursor-pointer flex items-center gap-1.5 hover:underline"><Store className="h-3 w-3" /> Become a Vendor</span>
             <span className="opacity-90 hover:opacity-100 cursor-pointer flex items-center gap-1.5 hover:underline"><HelpCircle className="h-3 w-3" /> 24/7 Support</span>
          </div>
          <div className="flex gap-6">
            <span className="opacity-90 hover:opacity-100 cursor-pointer hover:underline">Download App</span>
            <span className="opacity-90 hover:opacity-100 cursor-pointer hover:underline">English</span>
          </div>
        </div>

        <div className="container mx-auto px-4 h-20 md:h-16 flex items-center gap-4 md:gap-8 justify-between relative">
          
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger className="md:hidden text-slate-700 dark:text-slate-300 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
              <Menu className="h-6 w-6" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-[320px] p-0 border-r-0">
               <div className="bg-primary p-6 text-white bg-[url('https://ui.shadcn.com/placeholder.svg')] bg-cover">
                 <div className="flex items-center gap-4 mb-2">
                   <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                     <User className="h-6 w-6 text-white" />
                   </div>
                   <div>
                     <p className="font-bold text-lg">
                       {isAuthenticated ? `Welcome ${user?.firstName}` : "Welcome Guest"}
                     </p>
                     <p className="text-xs opacity-80">
                       {isAuthenticated ? "Manage your rentals" : "Login to manage rentals"}
                     </p>
                   </div>
                 </div>
                 {!isAuthenticated && (
                   <Link to="/login" className="w-full mt-4 block">
                     <Button variant="secondary" size="sm" className="w-full text-primary font-bold">Login / Sign Up</Button>
                   </Link>
                 )}
               </div>
               <div className="p-4 grid gap-2 overflow-y-auto max-h-[calc(100vh-180px)]">
                  <div className="font-bold text-sm text-slate-900 mb-2 px-2 uppercase tracking-wider">Shop By Category</div>
                  {categories.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between p-3 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors group">
                      <span className="flex items-center gap-4 font-medium text-slate-700 group-hover:text-primary">
                        <span className="text-xl bg-slate-100 w-8 h-8 flex items-center justify-center rounded-full group-hover:bg-purple-100">{cat.icon}</span> {cat.name}
                      </span>
                      <ChevronDown className="-rotate-90 h-4 w-4 text-slate-300 group-hover:text-primary" />
                    </div>
                  ))}
               </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="flex flex-col items-center md:items-start leading-none group mr-4">
            <div className="flex items-center gap-0.5 font-bold text-2xl text-primary dark:text-purple-400 tracking-tighter">
              <span className="text-3xl">R</span>ental<span className="text-purple-600 dark:text-purple-500">Mkt</span>
              <span className="h-2 w-2 bg-amber-400 dark:bg-amber-500 rounded-full mt-3 ml-0.5"></span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-widest hidden md:block">
              RENT . USE . RETURN
            </span>
          </Link>
          
          {/* Location Picker (Visible on larger screens) */}
          <Popover>
            <PopoverTrigger className="hidden lg:flex flex-col items-start h-10 py-0 px-2 hover:bg-purple-50 dark:hover:bg-slate-800 gap-0 rounded-md whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal ml-4">Delivering to</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <MapPin className="h-4 w-4 text-amber-500 dark:text-amber-400" /> {location || 'Select location'}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold mb-2 dark:text-slate-200">Choose your location</h4>
              <p className="text-xs text-muted-foreground dark:text-slate-400 mb-4">
                Delivery options and inventory availability depend on your location.
              </p>
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter pincode or city" 
                  className="h-9 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200" 
                  value={tempLocation}
                  onChange={(e) => {
                    setTempLocation(e.target.value);
                    console.log("📍 Location input:", e.target.value);
                  }}
                />
                <Button size="sm" onClick={handleLocationChange} className="dark:bg-purple-700 dark:hover:bg-purple-600">Apply</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Central Search Bar */}
          <div className="flex-1 max-w-2xl hidden md:block mx-4">
            <div 
              className={`flex items-center w-full rounded-lg border-2 transition-all overflow-hidden ${
                isSearchFocused 
                ? "border-primary shadow-lg shadow-purple-900/5 dark:shadow-purple-500/10 ring-2 ring-purple-100 dark:ring-purple-900" 
                : "border-slate-200 dark:border-slate-700 shadow-sm"
              }`}
            >
              <div className="bg-slate-50 dark:bg-slate-800 border-r dark:border-slate-700 px-2 h-10 flex items-center hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2">All</span>
                <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              </div>

              <Input
                type="text"
                placeholder="Search for cameras, laptops, drones..."
                className="border-0 focus-visible:ring-0 bg-white dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-500 px-4 h-10 text-sm w-full rounded-none"
                value={query}
                onChange={(e) => {
                  const value = e.target.value;
                  setQuery(value);
                  console.log("🔍 Search query:", value);
                  if (value.trim()) {
                    console.log("Search state updated - Value:", value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    addToRecentSearches(query);
                    console.log("🔍 Search submitted:", query);
                    console.log("Recent searches updated");
                  }
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
              
              <Button size="icon" className="h-10 w-12 rounded-none bg-primary text-white hover:bg-purple-700 transition-colors border-l border-primary">
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-5">
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="hidden md:flex flex-col items-start h-auto py-1 px-2 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-md cursor-pointer group transition-colors"
              aria-label="Toggle theme"
            >
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal group-hover:text-primary dark:group-hover:text-purple-400">Theme</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                {theme === 'light' ? (
                  <Moon className="h-4 w-4 text-primary dark:text-purple-400" />
                ) : (
                  <Sun className="h-4 w-4 text-purple-400" />
                )}
                {theme === 'light' ? 'Dark' : 'Light'}
              </span>
            </button>

            {/* Rental Period (Replaces Returns & Orders) */}
            <Popover open={rentalPopoverOpen} onOpenChange={setRentalPopoverOpen}>
              <PopoverTrigger className="hidden md:flex flex-col items-start h-auto py-1 px-3 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-md cursor-pointer group whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal group-hover:text-primary dark:group-hover:text-purple-400">Rental Period</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 text-primary dark:text-purple-400" />
                  {rentalStartDate && rentalEndDate ? `${getDays()} days` : "Select Dates"}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none dark:text-slate-200">Rental Duration</h4>
                    <p className="text-sm text-muted-foreground dark:text-slate-400">Pick your start and end dates.</p>
                  </div>
                  <div className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Start Date</span>
                        <Input
                          type="date"
                          className="h-8 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                          value={rentalStartDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="grid gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">End Date</span>
                        <Input
                          type="date"
                          className="h-8 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                          value={rentalEndDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={rentalStartDate || new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                    {rentalStartDate && rentalEndDate && (
                      <p className="text-xs text-primary dark:text-purple-400 font-medium text-center">
                        {getDays()} day{getDays() !== 1 ? "s" : ""} selected
                      </p>
                    )}
                    <Button size="sm" className="w-full mt-2 dark:bg-purple-700 dark:hover:bg-purple-600" onClick={handleRentalDatesApply}>
                      Apply Dates
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Cart */}
            <Link to="/cart">
              <Button variant="ghost" className="relative hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-purple-400 dark:text-slate-300 px-2 h-10 flex items-center gap-1">
                <div className="relative pt-1">
                  <ShoppingCart className="h-6 w-6" />
                  {cartItemCount > 0 && (
                    <span className="absolute top-0 -right-1.5 bg-amber-500 dark:bg-amber-600 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shadow-sm">
                      {cartItemCount}
                    </span>
                  )}
                </div>
                <span className="hidden xl:block font-bold mt-2">Cart</span>
              </Button>
            </Link>
            {/* Login / Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden md:flex flex-col items-start h-10 py-0 px-2 hover:bg-purple-50 dark:hover:bg-slate-800 gap-0 group rounded-md whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-accent-foreground">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                  {isAuthenticated ? `Hello, ${user?.firstName}` : "Hello, Sign in"}
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-purple-400 transition-colors flex items-center gap-1">
                  Account <ChevronDown className="h-3 w-3 opacity-50" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-0 overflow-hidden">
                {!isAuthenticated ? (
                  <div className="bg-purple-50 p-4 text-center">
                    <Link to="/login" className="block w-full mb-2">
                      <Button className="w-full h-8 text-xs font-bold">
                        Sign In
                      </Button>
                    </Link>
                    <p className="text-[10px] text-slate-500">
                      New customer?{" "}
                      <Link to="/signup/customer" className="text-primary hover:underline">
                        Start here.
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="bg-purple-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{user?.firstName} {user?.lastName}</p>
                        <p className="text-[10px] text-slate-500">{user?.email}</p>
                      </div>
                    </div>
                    <Button 
                      onClick={logout}
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                    >
                      Sign Out
                    </Button>
                  </div>
                )}
                <DropdownMenuSeparator className="m-0" />
                <div className="grid grid-cols-2 text-xs p-2 gap-2">
                   <div className="p-2">
                      <div className="font-bold mb-2 text-slate-900">Your Lists</div>
                      <div className="space-y-1 text-slate-600">
                        <div className="hover:text-primary hover:underline cursor-pointer">Wish List</div>
                        <div className="hover:text-primary hover:underline cursor-pointer">Saved for Later</div>
                      </div>
                   </div>
                   <div className="p-2 border-l">
                      <div className="font-bold mb-2 text-slate-900">Your Account</div>
                      <div className="space-y-1 text-slate-600">
                        <div className="hover:text-primary hover:underline cursor-pointer">Your Orders</div>
                        <div className="hover:text-primary hover:underline cursor-pointer">Your Rentals</div>
                        <div className="hover:text-primary hover:underline cursor-pointer">Returns</div>
                      </div>
                   </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Search - Only visible on very small screens */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative shadow-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-primary" />
            <Input placeholder="Search RentalMkt..." className="pl-10 h-10 bg-slate-100 border-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-white" />
          </div>
        </div>
      </header>
      
      {/* Category Strip - Amazon Style */}
      <div className="bg-slate-800 text-white shadow-md hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 py-2 text-[13px] font-medium min-w-max overflow-x-auto no-scrollbar">
            
            <div className="flex items-center gap-1 px-2 py-1 hover:border hover:border-white rounded-sm cursor-pointer mr-2">
               <Menu className="h-4 w-4" /> All
            </div>

            {categories.map((cat) => (
               <DropdownMenu key={cat.name}>
                 <DropdownMenuTrigger className="px-3 py-1 hover:border hover:border-white rounded-sm cursor-pointer outline-none data-[state=open]:bg-white data-[state=open]:text-slate-900 transition-colors">
                   {cat.name}
                 </DropdownMenuTrigger>
                 <DropdownMenuContent className="w-48 mt-1 p-2">
                   {cat.sub.map(s => (
                     <DropdownMenuItem key={s} className="cursor-pointer font-medium">{s}</DropdownMenuItem>
                   ))}
                   <DropdownMenuSeparator />
                   <DropdownMenuItem className="text-primary font-bold">View All {cat.name}</DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
            ))}

            <div className="ml-auto flex items-center gap-4 text-amber-400">
               <span className="cursor-pointer hover:text-white hover:underline">Great Indian Festival</span>
               <span className="h-4 w-px bg-slate-600"></span>
               <span className="cursor-pointer hover:text-white hover:underline flex items-center gap-1"><Heart className="h-3 w-3" /> Partner Offers</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
