import Head from "next/head";
import { FC } from "react";

const SITE_URL = "https://chordsofguitar.com";

/**
 * Returns a Next JS Head section with SEO meta tags for chord pages
 */
const MetaTags: FC<{
  currentPageTitle: string;
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  chordKey?: string;
  chordSuffix?: string;
}> = ({ 
  currentPageTitle, 
  title, 
  description, 
  url, 
  image = "/icons/icon-512x512.png",
  chordKey,
  chordSuffix 
}) => {
  const chordName = currentPageTitle.replace(/([a-z])([A-Z])/g, '$1 $2');
  const fullTitle = `${chordName} Guitar Chord - How to Play | ChordsofGuitar.com`;
  const fullDescription = description || `Learn how to play the ${chordName} chord on guitar. View finger positions, fret numbers, and hear how it sounds. Free guitar chord diagram and tutorial.`;
  const canonicalUrl = url || `${SITE_URL}/chords/${currentPageTitle.toLowerCase()}`;
  const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  // JSON-LD for chord page
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Play ${chordName} on Guitar`,
    description: fullDescription,
    image: imageUrl,
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        text: "Look at the chord diagram to see finger positions"
      },
      {
        "@type": "HowToStep",
        position: 2,
        text: "Place your fingers on the correct frets and strings"
      },
      {
        "@type": "HowToStep",
        position: 3,
        text: "Strum all strings that are not muted"
      },
      {
        "@type": "HowToStep",
        position: 4,
        text: "Click the play button to hear how it should sound"
      }
    ],
    tool: {
      "@type": "HowToTool",
      name: "Guitar"
    }
  };

  return (
    <Head>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={`${chordName} chord, ${chordName} guitar chord, how to play ${chordName}, ${chordName} chord diagram, guitar chords, learn guitar`} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="article" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="Diachords" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={imageUrl} />
      
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
};

export default MetaTags;
