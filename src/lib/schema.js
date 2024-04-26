/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

export let elementSchema = {
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
};

export let inputTypeSchema = {
  type: 'string',
  optional: true,
  default: 'text',
  lowercase: true,
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
};

export const controlSchema = {
  $$root: true,
  //   $$strict: 'remove',

  type: 'object',
  props: {
    element: elementSchema,
    attributes: {
      type: 'object',
      props: {
        name: { type: 'string' },
        type: inputTypeSchema,
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
    validation: {
      type: 'object',
      optional: true,
      props: {
        enum: {
          type: 'array',
          optional: true,
        },
        type: { type: 'string', optional: true, default: 'string' },
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
    content: { type: 'string', optional: true },
    classes: { type: 'array', default: ['col-sm-12'], optional: true, items: 'string' },
  },
};
