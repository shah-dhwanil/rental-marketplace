import { Link, useLoaderData } from "react-router";
import { ArrowRight, Star, Truck, ShieldCheck, Clock, MapPin, Search, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { homeLoader } from "@/loaders";
import { useWishlistStore, useCartStore, useRentalDatesStore } from "@/stores";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function Home() {
  const data = useLoaderData<typeof homeLoader>();
  const { isInWishlist, toggleWishlist } = useWishlistStore();
  const addToCart = useCartStore(state => state.addToCart);
  const { startDate, endDate, getDays } = useRentalDatesStore();

  const today = new Date().toISOString().split("T")[0];
  const oneWeekLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const days = getDays() || 7;
  return (
    <div className="flex flex-col pb-16 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors">
      
      {/* Category Circles (Mobile/Tablet friendly) */}
      <div className="bg-white dark:bg-slate-900 py-4 shadow-sm border-b dark:border-slate-800 mb-4">
        <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
           <div className="flex gap-6 min-w-max justify-start md:justify-center">
             {data.categories.map((cat) => (
               <Link key={cat.id} to={`/category/${cat.slug}`} className="flex flex-col items-center gap-2 group cursor-pointer min-w-[70px]">
                 <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-slate-100 dark:bg-slate-800 p-1 group-hover:ring-2 ring-primary dark:ring-purple-500 transition-all overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={cat.image_url} alt={cat.name} className="h-full w-full rounded-full object-cover group-hover:scale-110 transition-transform duration-500" />
                 </div>
                 <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-purple-400">{cat.name}</span>
               </Link>
             ))}
           </div>
        </div>
      </div>

      {/* Main Hero Slider */}
      <div className="container mx-auto px-4 mb-8">
        <Carousel className="w-full">
          <CarouselContent>
             {[1, 2, 3].map((slide) => (
                <CarouselItem key={slide}>
                  <div className="relative w-full h-[200px] md:h-[400px] bg-slate-900 dark:bg-slate-950 rounded-xl overflow-hidden group">
                    <img 
                      src={`https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=2000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`} 
                      alt="Banner" 
                      className="w-full h-full object-cover opacity-60 dark:opacity-40 group-hover:scale-105 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent flex items-center p-6 md:p-12">
                       <div className="max-w-xl space-y-4">
                          <Badge className="bg-amber-400 text-black hover:bg-amber-500 border-none font-bold">Limited Time Offer</Badge>
                          <h2 className="text-2xl md:text-5xl font-bold text-white leading-tight">
                            Upgrade Your Toolkit <br/>
                            <span className="text-amber-400">Without Emptying Your Wallet</span>
                          </h2>
                          <p className="text-slate-300 text-sm md:text-lg">Get 50% off on your first DSLR rental this week. Use code FIRST50.</p>
                          <Button size="lg" className="bg-primary hover:bg-purple-700 text-white border-none shadow-lg shadow-purple-900/20">Explore Offers</Button>
                       </div>
                    </div>
                  </div>
                </CarouselItem>
             ))}
          </CarouselContent>
          <CarouselPrevious className="left-4 bg-white/10 hover:bg-white text-white hover:text-black border-none" />
          <CarouselNext className="right-4 bg-white/10 hover:bg-white text-white hover:text-black border-none" />
        </Carousel>
      </div>

      {/* Recommended Section (Amazon Style Horizontal Scroll) */}
      <section className="container mx-auto px-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Featured Rentals</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Handpicked premium items</p>
            </div>
            <Button variant="outline" size="sm" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">View All</Button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar snap-x p-1">
            {data.featuredProducts.map((item) => (
              <div key={item.id} className="min-w-[280px] snap-center group">
                <Card className="h-full shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-200 dark:border-slate-700 overflow-hidden relative bg-white dark:bg-slate-900 rounded-xl">
                  <div className="aspect-[4/3] relative bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <Link to={`/product/${item.id}`}>
                      <img src={item.image_urls?.[0] || "https://via.placeholder.com/300"} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    </Link>
                    <div className="absolute top-2 left-2 bg-white/95 backdrop-blur text-[10px] font-bold px-2.5 py-1 rounded-full text-slate-800 flex items-center gap-1 shadow-sm border border-slate-100">
                      <MapPin className="h-3 w-3 text-primary" /> {item.id.slice(0, 8)}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleWishlist(item.id);
                          const isNowInWishlist = !isInWishlist(item.id);
                          console.log(
                            isNowInWishlist ? "❤️ Added to wishlist:" : "💔 Removed from wishlist:",
                            item.name
                          );
                        }}
                        className={`h-8 w-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                          isInWishlist(item.id)
                            ? "bg-red-500 text-white"
                            : "bg-white/95 backdrop-blur text-slate-600 hover:bg-red-50"
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isInWishlist(item.id) ? "fill-current" : ""}`} />
                      </button>
                      <div className="bg-amber-400 text-[10px] font-bold px-2 py-1 rounded text-black shadow-sm flex items-center h-8">
                        Featured
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="text-xs text-primary/80 dark:text-purple-400 font-bold uppercase tracking-wide">{item.created_at}</div>
                    <Link to={`/product/${item.id}`}>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-primary dark:group-hover:text-purple-400 transition-colors min-h-[44px]">{item.name}</h4>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <div className="flex text-amber-400 dark:text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-3 w-3 ${i < 4 ? "fill-current" : "text-slate-200 dark:text-slate-700"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">(0 reviews)</span>
                    </div>

                    <div className="pt-3 flex items-end justify-between border-t border-slate-100 dark:border-slate-800 mt-1">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatINR(item.price_day)}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/ day</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          addToCart({
                            productId: item.id,
                            productName: item.name,
                            productImage: item.image_urls?.[0] || "",
                            startDate: startDate || today,
                            endDate: endDate || oneWeekLater,
                            dailyRate: item.price_day,
                            totalDays: days,
                            deposit: 0,
                            deliveryMethod: "pickup",
                            deliveryFee: 0,
                          });
                          console.log("🛒 Added to cart:", item.name);
                        }}
                        className="h-9 bg-primary hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 px-4 rounded-lg font-semibold"
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Banners Grid */}
      <section className="container mx-auto px-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {[
              { title: "Camera Gear", discount: "Min 40% Off", img: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=600", color: "bg-blue-50" },
              { title: "Gaming Consoles", discount: "Weekend Special", img: "https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&q=80&w=600", color: "bg-purple-50" },
              { title: "Party Speakers", discount: "Rent 2 Get 1 Free", img: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&q=80&w=600", color: "bg-amber-50" }
           ].map((banner, i) => (
             <div key={i} className={`${banner.color} dark:bg-slate-800 rounded-xl overflow-hidden relative h-[240px] group flex flex-col justify-end p-6 transition-transform hover:-translate-y-1 hover:shadow-lg`}>
                <div className="relative z-10">
                   <Badge variant="secondary" className="mb-2 bg-white/80 dark:bg-slate-700/80 backdrop-blur">{banner.discount}</Badge>
                   <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{banner.title}</h3>
                   <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-purple-400 flex items-center gap-1 mt-2">
                     Check offers <ArrowRight className="h-4 w-4" />
                   </span>
                </div>
                <img 
                   src={banner.img} 
                   alt={banner.title} 
                   className="absolute top-0 right-0 w-3/4 h-full object-cover -z-0 opacity-80 mask-image-linear-to-b group-hover:scale-110 transition-transform duration-700" 
                   style={{ maskImage: 'linear-gradient(to bottom left, black 50%, transparent 100%)' }}
                />
             </div>
           ))}
        </div>
      </section>

      {/* Trust & Safety Banner */}
      <section className="bg-primary dark:bg-purple-900 text-white py-12 mb-8">
         <div className="container mx-auto px-4">
            <div className="flex flex-wrap md:flex-nowrap justify-between items-center bg-white/10 dark:bg-black/20 rounded-2xl p-8 backdrop-blur-sm">
               <div className="mb-6 md:mb-0 max-w-lg">
                  <h2 className="text-3xl font-bold mb-4">Rental Protection Guarantee</h2>
                  <p className="text-purple-100 dark:text-purple-200 text-lg">Every rental is insured against accidental damage. Rent with peace of mind knowing you're covered.</p>
                  <Button variant="secondary" className="mt-6 text-primary dark:text-purple-900 font-bold">Learn More</Button>
               </div>
               <div className="flex gap-8">
                  <div className="flex flex-col items-center text-center">
                     <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <ShieldCheck className="h-8 w-8" />
                     </div>
                     <span className="font-bold">Verified Vendors</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                     <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <Truck className="h-8 w-8" />
                     </div>
                     <span className="font-bold">Secure Delivery</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                     <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <Clock className="h-8 w-8" />
                     </div>
                     <span className="font-bold">24hr Support</span>
                  </div>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
