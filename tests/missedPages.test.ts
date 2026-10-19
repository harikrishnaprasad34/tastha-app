import React from "react";
import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { routeFor, storeLink } from "../src/navigation/routes";
import { Help } from "../src/screens/Help";
vi.mock("react-native",()=>({ScrollView:"ScrollView",Text:"Text",View:"View"}));
vi.mock("../src/components/ui",()=>({Button:"Button",styles:{}}));

describe("missed customer navigation paths",()=>{
 it.each(["/offers","/offers?sort=price_low","/offers?offersOnly=false"])("preserves the offers-only destination for %s",url=>{
  const route=storeLink(url),query=new URLSearchParams(route.split("?")[1]);
  expect(query.get("offersOnly")).toBe("true");
  if(url.includes("sort="))expect(query.get("sort")).toBe("price_low");
 });
 it("does not add an offers filter to ordinary shopping",()=>{
  expect(new URLSearchParams(storeLink("/shop").split("?")[1]).has("offersOnly")).toBe(false);
 });
 const screens=["Collections","Home","Shop","Wishlist","Bag","Account","EditProfile","Login","Signup","Addresses","AddressForm","Orders","Checkout","Location","AI","Search","Contact","Security","SavedLooks","Otp","Recovery","PaymentStatus"];
 it.each(screens)("links %s to an existing Expo screen",name=>{
  let path=routeFor(name).split("?")[0];
  if(path==="/(tabs)")path+="/index";
  expect(existsSync(new URL("../src/app"+path+".tsx",import.meta.url))).toBe(true);
 });
 it.each([["Product","product/[id]"],["OrderDetail","order/[id]"],["TrackOrder","order/[id]/tracking"]])("encodes %s identifiers without adding route segments",(name,file)=>{
  expect(routeFor(name,"id/with space")).toContain("id%2Fwith%20space");
  expect(existsSync(new URL("../src/app/"+file+".tsx",import.meta.url))).toBe(true);
 });
});
describe("invalid help deep links",()=>{
 it.each(["__proto__","constructor","toString","unknown"])("falls back safely for %s",section=>{
  const tree=Help({section,navigate:vi.fn()});
  const title=React.Children.toArray(tree.props.children)[0] as React.ReactElement<{children:string}>;
  expect(title.props.children).toBe("Frequently asked questions");
 });
 it.each(["faq","terms","privacy","shipping","returns"])("renders the %s policy overview",section=>{
  expect(()=>Help({section,navigate:vi.fn()})).not.toThrow();
 });
});
