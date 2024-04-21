/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import Validator from 'fastest-validator';

export const v = new Validator({
  messages: {
    // Register our new error message text
    color: "The '{field}' field must be an even number! Actual: {actual}",
    month: "The '{field}' field must be a valid month! Actual: {actual}",
    time: "The '{field}' field must be a valid time! Actual: {actual}",
  },
});

v.add('color', function ({ schema, messages }, path, context) {
  return {
    source: `
            function isColor(strColor) {
                const s = new Option().style;
                s.color = strColor;
                return s.color !== '';
            }
            if ( !isColor(value) ){
                ${this.makeError({ type: 'color', actual: 'value', messages })}
            }

            return value;
        `,
  };
});

v.add('month', function ({ schema, messages }, path, context) {
  return {
    source: `        
        let months = [], d, s;

        for (let i = 0; i <= 11; i++) {
            d = new Date().setMonth(i);
            s = new Date(d).toLocaleString("en-US", { month: "short" });
            months.push(
                String(i + 1),
                new Date(d).toLocaleString("en-US", { month: "long" }).toLowerCase(),
                s.toLowerCase()
            );
        }

        function isMonth(m) {
            return months.indexOf(String(m).toLowerCase()) > -1;
        }

        if ( isMonth(value)===false ){
            ${this.makeError({ type: 'month', actual: 'value', messages })}
        }

        return value;`,
  };
});

v.add('time', function ({ schema, messages }, path, context) {
  return {
    source: `        
        function isTime(str) {

            let numPat = /^[0-9]+$/;
            let numPatAMPM = /^([\\.apm0-9]+)$/i;
            let arr = str.split(/(:|\\s+)/).filter((s) => /^[^:\\s]+$/.test(s));
        
            if (numPat.test(arr[0]) === false || Number(arr[0]) >= 23) {
                return false;
            }
        
            if (numPat.test(arr[1]) === false || Number(arr[1]) >= 59) {
                return false;
            }

        
            if (arr[2]) {
                if (numPatAMPM.test(arr[2]) === false) {
                    return false;
                }
                if (numPat.test(arr[2]) && Number(arr[2]) >= 59) {
                    return false;
                }
            }

            if (arr[3] && numPatAMPM.test(arr[2]) === false) {
                return false;
            }
        
            return true;
        }

        if ( isTime(value)===false ){
            ${this.makeError({ type: 'time', actual: 'value', messages })}
        }

        return value;`,
  };
});

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

export let controlSchema = {
  $$root: true,
  //   $$strict: 'remove',
  type: 'array',
  items: {
    type: 'object',
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
        enum: [
          'input',
          'textarea',
          'select',
          'div',
          'hr',
          'br',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
        ],
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
          name: { type: 'string', optional: true },
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
      onChange: {
        type: 'array',
        optional: true,
        items: {
          type: 'object',
          props: {
            value: { type: 'any', optional: true },
            set: { type: 'object' },
          },
        },
      },
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
          css: { type: 'object', optional: true },
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
    console.log(o);
    return o.message + (o.expected ? ' dd: ' + o.expected : '');
  });

  return asArray ? errs : errs.join('\n  ');
}
