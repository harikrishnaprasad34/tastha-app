import { useDispatch, useSelector } from "react-redux";
import { api, session } from "../api/runtime";
import { buildStore, type AppDispatch, type AppState } from "./store";
export const store = buildStore({ api, session });
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<AppState>();
