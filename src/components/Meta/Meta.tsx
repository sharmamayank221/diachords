import Head from "next/head";
import { FC, useEffect } from "react";
/**
 * Returns a Next JS Head section to include the required meta tags for SEO purpose
 * @props currentPageTitle <string> - Title of the current page to be included
 * @props title <string> - Title detailing the contents of the page
 * @props description <string> - Contents to be added for description of the page for SEO
 * @props url <string> - URL of the link of the page the meta data is currently representing
 * @props image <string> - Dynamic image location for image to be shown as a placeholder
 *
 * @returns Next JS Head component with all of the SEO components
 */
const MetaTags: FC<{
  currentPageTitle: string;
  title?: string;
  description?: string;
  url?: string;
  image?: string;
}> = ({ currentPageTitle, title, description, url, image = "logo.svg" }) => {
  const titlePlaceholder = `ChordsofGuitar-${currentPageTitle} ${
    title ? "-" + title : ""
  }`;

  return (
    <Head>
      {/* // <!-- Primary Meta Tags --> */}
      <title>{titlePlaceholder}</title>
      {title && <meta name="title" content={title} />}
      {description && <meta name="description" content={description} />}

      {/* <!-- Open Graph / Facebook --> */}
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      {/* <!-- Twitter --> */}
      <meta property="twitter:card" content="summary_large_image" />
      {url && <meta property="twitter:url" content={url} />}
      {title && <meta property="twitter:title" content={title} />}
      {description && (
        <meta property="twitter:description" content={description} />
      )}
      {image && <meta property="twitter:image" content={image} />}
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />
    </Head>
  );
};

export default MetaTags;
