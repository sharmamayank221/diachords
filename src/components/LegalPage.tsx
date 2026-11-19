import React from "react";
import SEO from "@/components/SEO";

export default function LegalPage({
  title,
  description,
  canonical,
  updated,
  children,
}: {
  title: string;
  description: string;
  canonical: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SEO title={title} description={description} canonical={canonical} />
      <article className="max-w-2xl mx-auto px-5 py-8 md:py-12 font-Inter text-[15px] leading-relaxed text-gray-300 [&_h2]:font-Space-Grotesk [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_p]:mb-3 [&_a]:text-[#1BD79E] [&_a]:underline">
        <h1 className="font-Space-Grotesk font-bold text-3xl md:text-4xl text-white mb-2">{title}</h1>
        <p className="text-xs text-gray-500 mb-6">Last updated {updated}</p>
        {children}
      </article>
    </>
  );
}
