/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

let controls = [
  {
    element: 'input',
    attributes: {
      name: 'one',
      value: 'One',
    },
    classes: ['col-sm-12', 'col-md-6'],
    validation: {
      type: 'string',
      min: 6,
      lowercase: true,
    },
    label: '<i>RRRR</i>',
  },
  {
    element: 'input',
    attributes: {
      name: 'rre',
      value: 'One',
    },
    classes: ['col-sm-12', 'col-md-6'],
    validation: {
      type: 'string',
      min: 6,
      lowercase: true,
    },
    label: 'PEE',
  },
  {
    element: 'select',
    attributes: {
      name: 'two',
      //   required: true,
      placeholder: 'select a value',
    },
    options: ['Radio 1', 'Radio 2'],
    classes: ['col-sm-12', 'col-md-6'],
  },
  {
    element: 'input',
    attributes: {
      type: 'checkbox',
      name: 'three',
      required: true,
    },
  },
  {
    element: 'textarea',
    attributes: {
      name: 'txt',
      required: true,
    },
    validation: {
      max: 50,
      min: 10,
    },
  },
  {
    element: 'input',
    attributes: {
      type: 'hidden',
      name: 'four',
      required: true,
      value: 'ee',
    },
  },

  {
    element: 'div',
    content: '<h2>Help me</help>',
    // classes: ['one', 'two'],
  },
];

let s = new SvelteFormer({
  target: document.body,
  props: {
    controls,
    // action
    action: '',
    //  post
    method: 'post',
  },
});
// console.log(s);
