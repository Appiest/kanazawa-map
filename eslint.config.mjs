import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [".next/**", "public/**", "node_modules/**"],
  },
  {
    rules: {
      complexity: ["error", { max: 8 }],
      "max-depth": ["error", 3],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
    },
  },
];

export default config;
