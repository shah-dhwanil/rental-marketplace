import { type LoaderFunctionArgs } from "react-router";
import { listAllProducts, listCategories } from "@/services/catalog.service";

export async function categoryLoader({ params, request }: LoaderFunctionArgs) {
  const { slug } = params;
  const url = new URL(request.url);

  if (!slug) {
    throw new Response("Category slug is required", { status: 400 });
  }

  const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1;
  const pageSize = 24;
  const startDate = url.searchParams.get("start_date") || undefined;
  const endDate = url.searchParams.get("end_date") || undefined;
  const latStr = url.searchParams.get("lat");
  const lngStr = url.searchParams.get("lng");
  const pincode = url.searchParams.get("pincode") || "";
  const lat = latStr ? Number(latStr) : undefined;
  const lng = lngStr ? Number(lngStr) : undefined;

  try {
    const allCategoriesResponse = await listCategories({ page: 1, page_size: 100 });
    const category = allCategoriesResponse.items.find((cat) => cat.slug === slug);

    if (!category) {
      throw new Response("Category not found", { status: 404 });
    }

    const productsResponse = await listAllProducts({
      page,
      page_size: pageSize,
      category_id: category.id,
      is_active: true,
      start_date: startDate,
      end_date: endDate,
      lat,
      lng,
    });

    return {
      category,
      pincode,
      startDate: startDate || "",
      endDate: endDate || "",
      lat,
      lng,
      products: productsResponse.items,
      total: productsResponse.total,
      page: productsResponse.page,
      pages: productsResponse.pages,
      page_size: productsResponse.page_size,
    };
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Failed to load category:", error);
    throw new Response("Category not found", { status: 404 });
  }
}
