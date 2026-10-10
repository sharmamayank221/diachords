/** @type {import('tailwindcss').Config} */

const config = {
  mode: "jit",
  corePlugins: {
    backgroundOpacity: false,
    borderOpacity: false,
    divideOpacity: false,
    float: false,
    fontVariantNumeric: false,
    placeholderOpacity: false,
    ringColor: false,
    ringOffsetColor: false,
    ringOffsetWidth: false,
    ringOpacity: false,
    ringWidth: false,
    textOpacity: false,
  },
  purge: ["./public/**/*.html", "./src/**/*.{js,jsx,ts,tsx,vue}"],
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        Lora: ['"Lora"'],
        "Space-Grotesk": ['"Space Grotesk"', "sans-serif"],
        Manrope: ['"Manrope"', "sans-serif"],
        Inter: ['"Inter"', "sans-serif"],
      },
    },
  },
  plugins: [],
};

module.exports = config;
