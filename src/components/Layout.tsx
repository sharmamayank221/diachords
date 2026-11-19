import React from "react";
import Footer from "./Footer";
import Header from "./Header";
import TabBar from "./Native/TabBar";
import { IS_NATIVE_APP } from "@/lib/native";

export default function Layout({ children }: any) {
  if (IS_NATIVE_APP) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <main className="pb-tabbar" style={{ backgroundColor: "#000" }}>{children}</main>
        <TabBar />
      </div>
    );
  }
  return (
    <div>
      <Header />
      <main style={{ backgroundColor: "#000" }}>{children}</main>
      <Footer />
    </div>
  );
}
