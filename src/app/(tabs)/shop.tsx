import React, { useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Catalog } from "../../screens/Shop";
import { useNavigate } from "../../navigation/useNavigate";
import {
  catalogRouteFilter,
  catalogRouteParams,
} from "../../shared/catalogFilters";
import type { CatalogFilter } from "../../models";
export default function Screen() {
  const navigate = useNavigate();
  const router = useRouter();
  const params = useLocalSearchParams();
  const filter = catalogRouteFilter(params);
  const onFiltersChange = useCallback(
    (value: CatalogFilter) => router.setParams(catalogRouteParams(value)),
    [router],
  );
  return (
    <Catalog
      navigate={navigate}
      {...filter}
      onFiltersChange={onFiltersChange}
    />
  );
}
