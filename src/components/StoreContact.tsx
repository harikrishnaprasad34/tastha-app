import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useAppDispatch, useAppSelector } from "../state";
import { fetchPublicSettings } from "../state/store";
import {
  displayStorePhone,
  storeAddress,
  supportLinks,
} from "../shared/storefrontSettings";
import { Button, ErrorBox, styles as s } from "./ui";
export function StoreContact({ compact = false }: { compact?: boolean }) {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector(
    (state) => state.publicSettings,
  );
  const [linkError, setLinkError] = useState("");
  useFocusEffect(
    useCallback(() => {
      void dispatch(fetchPublicSettings());
    }, [dispatch]),
  );
  async function open(url: string) {
    setLinkError("");
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError("Unable to open this contact. Use the details shown here.");
    }
  }
  const links = data ? supportLinks(data) : null;
  return (
    <View style={s.panel}>
      <Text style={s.heading}>{data?.storeName || "Tastha"}</Text>
      {loading && !data ? (
        <Text style={s.muted}>Loading contact details…</Text>
      ) : null}
      <ErrorBox message={error} retry={() => dispatch(fetchPublicSettings())} />
      {data && links ? (
        <>
          {data.email ? (
            links.email ? (
              <Button
                title={data.email}
                outline
                onPress={() => {
                  void open(links.email);
                }}
              />
            ) : (
              <Text style={s.text}>{data.email}</Text>
            )
          ) : null}
          {data.phone ? (
            links.phone ? (
              <Button
                title={displayStorePhone(data.phone)}
                outline
                onPress={() => {
                  void open(links.phone);
                }}
              />
            ) : (
              <Text style={s.text}>{data.phone}</Text>
            )
          ) : null}
          {!compact ? (
            <>
              <Text style={s.text}>{data.legalName}</Text>
              <Text style={s.muted}>{storeAddress(data)}</Text>
            </>
          ) : null}
        </>
      ) : null}
      <ErrorBox message={linkError} />
    </View>
  );
}
