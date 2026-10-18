import React from "react";
import { Redirect, useLocalSearchParams, type Href } from "expo-router";
import { safeReturnTo } from "../navigation/authReturn";
import { useAppSelector } from "../state";
import { Login } from "../screens/Account";
import { useNavigate } from "../navigation/useNavigate";
export default function Screen() {
  const navigate = useNavigate();
  const user = useAppSelector((x) => x.auth.user);
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  return user ? (
    <Redirect href={safeReturnTo(returnTo) as Href} />
  ) : (
    <Login navigate={navigate} />
  );
}
