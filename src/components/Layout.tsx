import React from "react";
import Footer from "./Footer";
import Header from "./Header";
import Image from "next/image";

export default function Layout({ children }: any) {
  return (
    <div>
      <Header />
      <main style={{ backgroundColor: "#000" }} className="sm:block hidden">
        {children}
      </main>

      <div className="h-screen bg-black flex flex-col items-center justify-center sm:hidden">
        <div className="relative w-[214px] h-[185px]">
          <Image src="/rotate.svg" alt="rotate-screen" fill />
        </div>
        <span className="text-white text-center text-2xl pt-3">
          Please rotate your screen for better viewing experience
        </span>
      </div>
      <Footer />
    </div>
  );
}
