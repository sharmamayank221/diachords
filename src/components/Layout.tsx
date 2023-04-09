import React from "react";
import Footer from "./Footer";
import Header from "./Header";

export default function Layout({ children }: any) {
  return (
    <>
      <Header />
      <main style={{ backgroundColor: "#000" }}>{children}</main>
      <Footer />
    </>
  );
}
