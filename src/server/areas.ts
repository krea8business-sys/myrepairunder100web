import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";

export type ServiceabilityResult = {
  serviceable: boolean;
  pincodeKnown: boolean;
  locality: string | null;
  city: string | null;
  state: string | null;
  unsupportedCategoryIds: string[];
  message: string;
};

/**
 * Checks a pincode against admin-configured service areas.
 * This is a configuration lookup, NOT address verification.
 */
export async function checkServiceability(pincode: string, categoryIds: string[]): Promise<ServiceabilityResult> {
  const areas = await db
    .select()
    .from(schema.serviceAreas)
    .where(and(eq(schema.serviceAreas.pincode, pincode), eq(schema.serviceAreas.active, true)));

  if (areas.length === 0) {
    return {
      serviceable: false,
      pincodeKnown: false,
      locality: null,
      city: null,
      state: null,
      unsupportedCategoryIds: categoryIds,
      message: "Sorry, we don't serve this pincode yet. We're expanding across Delhi NCR — please contact support to check.",
    };
  }

  const links = await db
    .select()
    .from(schema.areaCategories)
    .where(inArray(schema.areaCategories.areaId, areas.map((a) => a.id)));

  // A category is supported if ANY active area for this pincode supports it (no links = all categories).
  const supported = (catId: string) =>
    areas.some((a) => {
      const own = links.filter((l) => l.areaId === a.id);
      return own.length === 0 || own.some((l) => l.categoryId === catId);
    });

  const unsupported = [...new Set(categoryIds)].filter((c) => !supported(c));
  const first = areas[0];
  return {
    serviceable: unsupported.length === 0,
    pincodeKnown: true,
    locality: areas.map((a) => a.locality).join(", "),
    city: first.city,
    state: first.state,
    unsupportedCategoryIds: unsupported,
    message:
      unsupported.length === 0
        ? `Great — we serve ${first.locality}, ${first.city} (${pincode}).`
        : "Some services in your cart aren't available in this pincode yet.",
  };
}

export async function getPublishedAreas() {
  const rows = await db
    .select()
    .from(schema.serviceAreas)
    .where(eq(schema.serviceAreas.active, true));
  return rows;
}
