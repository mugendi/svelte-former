/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

const magicSplit =
  /^[a-zà-öø-ÿ]+|[A-ZÀ-ÖØ-ß][a-zà-öø-ÿ]+|[a-zà-öø-ÿ]+|[0-9]+|[A-ZÀ-ÖØ-ß]+(?![a-zà-öø-ÿ])/g;

export const schemaVals = [
  'min',
  'max',
  'enum',
  'length',
  'contains',
  'equal',
  'notEqual',
  'integer',
  'positive',
  'negative',
  'minProps',
  'maxProps',
  'alpha',
  'pattern',
  'alphanum',
  'alphadash',
  'hex',
  'singleLine',
  'base64',
  'lowercase',
  'uppercase',
  'localeLowercase',
  'localeUppercase',
  'padStart',
  'padEnd',
  'trimLeft',
  'trimRight',
  'trim',
  'normalize',
];

export let controlSchema = {
  $$root: true,
  $$strict: 'remove',
  type: 'array',
  items: {
    type: 'object',
    $$strict: 'remove',
    props: {
      validation: {
        type: 'object',
        optional: true,
        props: {
          enum: {
            type: 'array',
            optional: true,
          },
          type: 'string',
          required: { type: 'boolean', optional: true },
          name: { type: 'string', optional: true },
          lowercase: { type: 'boolean', optional: true },
          min: { type: 'number', optional: true },
          max: { type: 'number', optional: true },
          contains: { type: 'any', optional: true },
          equal: { type: 'any', optional: true },
          notEqual: { type: 'any', optional: true },
          positive: { type: 'boolean', optional: true },
          negative: { type: 'boolean', optional: true },
          integer: { type: 'boolean', optional: true },
          minProps: { type: 'number', optional: true, positive: true },
          maxProps: { type: 'number', optional: true, positive: true },
          alphanum: { type: 'boolean', optional: true },
          alphadash: { type: 'boolean', optional: true },
          hex: { type: 'boolean', optional: true },
          singleLine: { type: 'boolean', optional: true },
          base64: { type: 'boolean', optional: true },
          lowercase: { type: 'boolean', optional: true },
          uppercase: { type: 'boolean', optional: true },
          localeLowercase: { type: 'boolean', optional: true },
          localeUppercase: { type: 'boolean', optional: true },
          padStart: { type: 'number', optional: true },
          padEnd: { type: 'number', optional: true },
          padStart: { type: 'number', optional: true },
          trimLeft: { type: 'boolean', optional: true },
          trimRight: { type: 'boolean', optional: true },
          trim: { type: 'boolean', optional: true },
          normalize: { type: 'boolean', optional: true },
        },
      },
      element: {
        type: 'string',
        optional: true,
        default: 'input',
        lowercase: true,
        enum: ['input', 'textarea', 'select','div','hr','br','h1','h2','h3','h4','h5','h6'],
      },
      attributes: {
        type: 'object',
        props: {
          type: {
            type: 'string',
            optional: true,
            default: 'text',
            enum: [
              'button',
              'checkbox',
              'color',
              'date',
              'datetime-local',
              'email',
              'file',
              'hidden',
              'image',
              'month',
              'number',
              'password',
              'radio',
              'range',
              'reset',
              'search',
              'submit',
              'tel',
              'text',
              'time',
              'url',
              'week',
            ],
          },
          value: {
            type: 'multi',
            optional: true,
            rules: [
              { type: 'any' },
              {
                type: 'array',
                items: {
                  type: 'multi',
                  rules: [
                    {
                      type: 'object',
                      props: {
                        text: 'string',
                        value: 'any',
                        checked: { type: 'boolean', optional: true },
                      },
                    },
                    { type: 'any' },
                  ],
                },
              },
            ],
          },
          required: { type: 'boolean', optional: true },
          name:  { type: 'string', optional: true },
          placeholder: { type: 'string', optional: true },
        },
      },
      label: {
        type: 'multi',
        optional: true,
        rules: [
          { type: 'string' },
          {
            type: 'object',
            props: {
              text: 'string',
              classes: {
                type: 'array',
                items: 'string',
                optional: true,
              },
            },
          },
        ],
      },
      wrap: {
        type: 'multi',
        optional: true,
        rules: [
          { type: 'string' },
          {
            type: 'object',
            //
            props: {
              element: {
                type: 'string',
                optional: true,
                default: 'div',
              },
              classes: {
                type: 'array',
                items: 'string',
              },
            },
          },
        ],
      },
      options: {
        type: 'array',
        optional: true,
        items: {
          type: 'multi',
          rules: [
            { type: 'any' },
            {
              type: 'object',
              props: {
                text: 'string',
                value: 'any',
              },
            },
          ],
        },
      },
      checked: { type: 'boolean', optional: true },
    },
  },
};

export let buttonSchema = {
  $$root: true,
  $$strict: 'remove',
  type: 'array',

  items: {
    type: 'multi',
    optional: true,
    rules: [
      { type: 'string' },
      {
        type: 'object',
        props: {
          text: 'string',
          css: { type: 'object' , optional: true,},
          attributes: {
            type: 'object',
            default: { type: 'submit' },
            props: {
              type: {
                type: 'string',
                lowercase: true,
                optional: true,
                enum: ['button', 'submit', 'reset'],
              },
            },
          },
        },
      },
    ],
  },
};

export function validationError(validate, asArray = false) {
  let errs = validate.map((o) => {
    return o.message + (o.expected ? ' Expected: ' + o.expected : '');
  });

  return asArray ? errs : errs.join('\n  ');
}

/**
 * Capitalises a single word
 * @returns the word with the first character in uppercase and the rest in lowercase
 */
export function capitaliseWord(string) {
  const match = string.matchAll(magicSplit).next().value;
  const firstLetterIndex = match ? match.index : 0;
  return (
    string.slice(0, firstLetterIndex + 1).toUpperCase() +
    string.slice(firstLetterIndex + 1).toLowerCase()
  );
}

export function controlError(control, errorMessage) {
  throw new Error(
    'Error with control [' + control.idx + ']\n  ' + errorMessage
  );
}

export const validationTypes = {
  date: 'date',
  'datetime-local': 'date',
  email: 'email',
  number: 'number',
  url: 'url',
  password: 'string',
  text: 'string',
  color: 'color',
  month: 'month',
  time: 'time',
  // button: "",
  // checkbox: "",
  // file: "",
  // hidden: "",
  // image: "",
  // radio: "",
  // range: "",
  // reset: "",
  // search: "",
  // submit: "",
  // tel: "",
  // week: "",
};
