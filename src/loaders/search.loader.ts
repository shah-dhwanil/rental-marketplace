import { type LoaderFunctionArgs } from "react-router";
import { listAllProducts, listCategories } from "@/services/catalog.service";

export async function searchLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1;
  const pageSize = 24;
  const categoryId = url.searchParams.get("category_id") || undefined;
  const startDate = url.searchParams.get("start_date") || undefined;
  const endDate = url.searchParams.get("end_date") || undefined;
  const latStr = url.searchParams.get("lat");
  const lngStr = url.searchParams.get("lng");
  const pincode = url.searchParams.get("pincode") || "";
  const lat = latStr ? Number(latStr) : undefined;
  const lng = lngStr ? Number(lngStr) : undefined;

  try {
    const [productsResponse, categoriesResponse] = await Promise.all([
      listAllProducts({
        q: query || undefined,
        page,
        page_size: pageSize,
        is_active: true,
        category_id: categoryId,
        start_date: startDate,
        end_date: endDate,
        lat,
        lng,
      }),
      listCategories({ page: 1, page_size: 100 }),
    ]);

    return {
      query,
      pincode,
      categoryId: categoryId || "",
      startDate: startDate || "",
      endDate: endDate || "",
      lat,
      lng,
      products: productsResponse.items,
      categories: categoriesResponse.items,
      total: productsResponse.total,
      page: productsResponse.page,
      pages: productsResponse.pages,
      page_size: productsResponse.page_size,
    };
  } catch (error) {
    console.error("Failed to search products:", error);
    return {
      query,
      pincode,
      categoryId: categoryId || "",
      startDate: startDate || "",
      endDate: endDate || "",
      lat,
      lng,
      products: [],
      categories: [],
      total: 0,
      page: 1,
      pages: 0,
      page_size: pageSize,
    };
  }
}
