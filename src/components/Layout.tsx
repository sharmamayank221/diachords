import React from "react";
import Footer from "./Footer";
import Header from "./Header";
import Image from "next/image";

export default function Layout({ children }: any) {
  return (
    <div>
      <Header />
      <main style={{ backgroundColor: "#000" }}>{children}</main>
      <Footer />
    </div>
  );
}
