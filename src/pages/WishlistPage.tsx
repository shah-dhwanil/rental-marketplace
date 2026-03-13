import { Link } from "react-router";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWishlistStore, useCartStore, useRentalDatesStore } from "@/stores";
import { listAllProducts } from "@/services/catalog.service";
import { useEffect, useState } from "react";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

interface WishlistProduct {
  id: string;
  name: string;
  price_day: number;
  image_urls: string[];
  created_at: string;
}

export function WishlistPage() {
  const { productIds, removeFromWishlist } = useWishlistStore();
  const { addToCart } = useCartStore();
  const { startDate, endDate, getDays } = useRentalDatesStore();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const oneWeekLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  const days = getDays() || 7;

  useEffect(() => {
    if (productIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      try {
        const allProducts = await listAllProducts({ page: 1, page_size: 100, is_active: true });
        const wishlistProducts = allProducts.items.filter((p: any) =>
          productIds.includes(p.id)
        ) as WishlistProduct[];
        setProducts(wishlistProducts);
      } catch (error) {
        console.error("Failed to fetch wishlist products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [productIds]);

  const handleRemoveFromWishlist = (productId: string) => {
    removeFromWishlist(productId);
  };

  const handleAddToCart = (product: WishlistProduct) => {
    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.image_urls?.[0] || "",
      startDate: (startDate || today) as string,
      endDate: (endDate || oneWeekLater) as string,
      dailyRate: product.price_day,
      totalDays: days,
      deposit: 0,
      deliveryMethod: "pickup",
      deliveryFee: 0,
    });
    console.log("🛒 Added to cart:", product.name);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 dark:text-slate-400">
          <Link to="/" className="hover:text-primary">Home</Link>
          <span>/</span>
          <span className="text-slate-700 dark:text-slate-300">Wishlist</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">My Wishlist</h1>
          <p className="text-slate-600 dark:text-slate-400">
            {productIds.length === 0
              ? "You haven't added anything to your wishlist yet"
              : `You have ${productIds.length} item${productIds.length !== 1 ? "s" : ""} in your wishlist`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : productIds.length === 0 ? (
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Heart className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-600 dark:text-slate-400 text-lg mb-6">
                Your wishlist is empty
              </p>
              <p className="text-slate-500 dark:text-slate-500 mb-6">
                Add your favorite rentals to your wishlist to keep track of items you want to rent later.
              </p>
              <Link to="/">
                <Button className="bg-primary hover:bg-purple-700 text-white font-semibold">
                  Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Product</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                      <td className="px-6 py-4">
                        <Link to={`/product/${product.id}`} className="flex items-center gap-4 group">
                          <img
                            src={product.image_urls?.[0] || "https://via.placeholder.com/80"}
                            alt={product.name}
                            className="h-16 w-16 rounded object-cover group-hover:opacity-75 transition"
                          />
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary dark:group-hover:text-purple-400 transition">
                              {product.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Added {new Date(product.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {formatINR(product.price_day)}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">/day</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleAddToCart(product)}
                            size="sm"
                            className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800 font-semibold"
                          >
                            <ShoppingCart className="h-4 w-4 mr-1" />
                            Add to Cart
                          </Button>
                          <Button
                            onClick={() => handleRemoveFromWishlist(product.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Grid View */}
            <div className="md:hidden grid grid-cols-1 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 overflow-hidden">
                  <Link to={`/product/${product.id}`}>
                    <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img
                        src={product.image_urls?.[0] || "https://via.placeholder.com/300"}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  </Link>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <Link to={`/product/${product.id}`}>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary dark:hover:text-purple-400 transition line-clamp-2">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Added {new Date(product.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(product.price_day)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">/day</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAddToCart(product)}
                        className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800 font-semibold"
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Add to Cart
                      </Button>
                      <Button
                        onClick={() => handleRemoveFromWishlist(product.id)}
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary Card */}
            {products.length > 0 && (
              <div className="mt-8 p-6 bg-gradient-to-r from-primary to-purple-600 dark:from-purple-900 dark:to-purple-800 rounded-lg text-white">
                <h3 className="text-lg font-semibold mb-2">Ready to rent?</h3>
                <p className="text-purple-100 mb-4">
                  You have {products.length} item{products.length !== 1 ? "s" : ""} in your wishlist.
                  Add them to cart and proceed to checkout.
                </p>
                <Link to="/cart">
                  <Button className="bg-white text-primary hover:bg-slate-100 font-semibold">
                    Go to Cart
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
