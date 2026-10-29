import React, { useState } from "react";
import { Text, View } from "react-native";
import type { Product } from "../models";
import { productSizeGuide } from "../shared/sizeGuide";
import { Button, styles as s } from "./ui";
export function SizeGuide({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const chart = productSizeGuide(product, unit);
  return (
    <View style={{ gap: 12 }}>
      <Button
        title={open ? "Close size guide" : "Size guide"}
        outline
        onPress={() => setOpen((value) => !value)}
      />
      {open ? (
        <View style={s.panel}>
          <Text style={s.heading}>{chart.measurementType}</Text>
          {chart.rows.length ? (
            <>
              {chart.unit ? (
                <View style={s.row}>
                  <Button
                    title="Inches"
                    selected={unit === "in"}
                    icon={unit === "in" ? "check" : undefined}
                    outline
                    onPress={() => setUnit("in")}
                  />
                  <Button
                    title="Centimetres"
                    selected={unit === "cm"}
                    icon={unit === "cm" ? "check" : undefined}
                    outline
                    onPress={() => setUnit("cm")}
                  />
                </View>
              ) : null}
              {chart.rows.map((row, index) => (
                <View key={String(row.size) + index} style={s.pill}>
                  <Text style={s.heading}>Size {row.size}</Text>
                  {Object.entries(row)
                    .filter(([key]) => key !== "size")
                    .map(([key, value]) => (
                      <Text key={key} style={s.text}>
                        {key.replace(/([A-Z])/g, " $1")}: {value}
                        {chart.unit ? " " + chart.unit : ""}
                      </Text>
                    ))}
                </View>
              ))}
            </>
          ) : (
            <Text style={s.muted}>
              A size chart has not been provided for this product. Contact us
              for sizing help.
            </Text>
          )}
          {chart.notes ? <Text style={s.muted}>{chart.notes}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
