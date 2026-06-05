/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['theme', 'tailwind', 'apply', 'layer', 'config', 'custom-variant'],
      },
    ],
    'function-no-unknown': [
      true,
      {
        ignoreFunctions: ['theme', 'screen'],
      },
    ],
    'alpha-value-notation': null,
    'hue-degree-notation': null,
    'lightness-notation': null,
    'color-function-notation': null,
  },
};
