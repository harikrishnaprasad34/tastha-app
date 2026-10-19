import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { ApiClient } from "../api/client";
import {
  loadCollection,
  loadCollections,
  type CollectionDetail,
  type StoreCollection,
} from "../api/collections";
interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  requestId: string | null;
}
export interface CollectionState {
  list: Resource<StoreCollection[]>;
  detail: Resource<CollectionDetail> & { key: string };
}
const resource = <T>(): Resource<T> => ({
  data: null,
  loading: false,
  error: null,
  requestId: null,
});
const initial = (): CollectionState => ({
  list: resource(),
  detail: { ...resource<CollectionDetail>(), key: "" },
});
const thunk = createAsyncThunk.withTypes<{ extra: { api: ApiClient } }>();
export const fetchCollections = thunk(
  "collections/list",
  async (_, { extra, signal }) => loadCollections(extra.api, signal),
);
export const collectionKey = (slug: string, pin: string) =>
  JSON.stringify([slug, pin]);
export const fetchCollection = thunk(
  "collections/detail",
  async ({ slug, pin }: { slug: string; pin: string }, { extra, signal }) =>
    loadCollection(extra.api, slug, pin, signal),
);
export const collectionsSlice = createSlice({
  name: "collections",
  initialState: initial(),
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCollections.pending, (s, a) => {
      s.list.loading = true;
      s.list.error = null;
      s.list.requestId = a.meta.requestId;
    });
    b.addCase(fetchCollections.fulfilled, (s, a) => {
      if (s.list.requestId !== a.meta.requestId) return;
      s.list.data = a.payload;
      s.list.loading = false;
    });
    b.addCase(fetchCollections.rejected, (s, a) => {
      if (s.list.requestId !== a.meta.requestId) return;
      s.list.loading = false;
      if (!a.meta.aborted)
        s.list.error = a.error.message || "Collections unavailable";
    });
    b.addCase(fetchCollection.pending, (s, a) => {
      s.detail = {
        ...resource<CollectionDetail>(),
        key: collectionKey(a.meta.arg.slug, a.meta.arg.pin),
        loading: true,
        requestId: a.meta.requestId,
      };
    });
    b.addCase(fetchCollection.fulfilled, (s, a) => {
      if (s.detail.requestId !== a.meta.requestId) return;
      s.detail.data = a.payload;
      s.detail.loading = false;
    });
    b.addCase(fetchCollection.rejected, (s, a) => {
      if (s.detail.requestId !== a.meta.requestId) return;
      s.detail.loading = false;
      if (!a.meta.aborted)
        s.detail.error = a.error.message || "Collection unavailable";
    });
    b.addCase("location/setLocation", (s) => {
      s.detail = initial().detail;
    });
  },
});
