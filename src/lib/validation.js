/**
 * Copyright (c) 2024 Anthony Mugendi
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

import Validator from 'fastest-validator';
import { controlSchema } from './schema';
import { merge } from './merge';
import { clone, labelText, formInputTypes } from './utils';

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

function validate(val, schema, errorPrefix = '', throwError = true) {
  const check = v.compile(schema);
  const isValid = check(val);

  if (isValid !== true) {
    let message =
      '\n' + errorPrefix + isValid.map((o) => o.message).join('\n\t');
    if (throwError) {
      throw new Error(message);
    }

    return message;
  } else {
    return null;
  }
}

export function validateControls(controls) {
  let inputNames = {};
  let inputIds = {};
  let control;

  for (let i in controls) {
    i = Number(i);

    control = controls[i];

    let schema = clone(controlSchema);
    // radio & select boxes must have an options key
    if (
      control.element == 'select' ||
      (control.element == 'input' && control.attributes.type == 'radio')
    ) {
      schema.props.options.optional = false;
    }

    // hidden fields must have a value attr
    if (control.element == 'input' && control.attributes.type == 'hidden') {
      schema.props.attributes.value = 'any';
    }

    // if not control,
    // name name attribute optional
    // make content a must
    if (formInputTypes.indexOf(control.element) == -1) {
      schema.props.attributes.optional = true;
      schema.props.attributes.props.name.optional = true;
      schema.props.content.optional = false;
    }

    // validate
    validate(control, schema, 'Control[' + (i + 1) + '] ');

    if (!control.attributes) {
      continue;
    }

    // ensure unique names
    if (control.attributes.name in inputNames) {
      throw new Error(
        'Control[' +
          (i + 1) +
          '] attributes.name "' +
          control.attributes.name +
          '" has already been used with Control[' +
          (inputNames[control.attributes.name] + 1) +
          ']'
      );
    }

    inputNames[control.attributes.name] = i;

    if ('id' in control.attributes && control.attributes.id in inputIds) {
      throw new Error(
        'Control[' +
          (i + 1) +
          '] attributes.id "' +
          control.attributes.id +
          '" has already been used with Control[' +
          (inputIds[control.attributes.id] + 1) +
          ']'
      );
    }

    inputIds[control.attributes.id] = i;

    // add id attribute if missing
    if ('id' in control.attributes === false) {
      control.attributes.id = 'control-' + control.element + '-' + (i + 1);
    }
  }

  inputNames = null;
  inputIds = null;
  control = null;

  return controls;
}

export function validateValue(control) {
  let label = labelText(control);
  let valueSchema = {
    type: 'string',
    label,
    optional: true,
    convert: true,
  };

  if ('validation' in control) {
    valueSchema = merge(valueSchema, control.validation);
  } else {
    // if required
    if (control.attributes.required) {
      valueSchema.type = validationTypes[control.attributes.type] || 'string';
      valueSchema.optional = false;
    }
  }

  let schema = {
    value: valueSchema,
  };

  // validate
  let obj = { value: control.attributes.value };
  let error = validate(obj, schema, '', false);

  control.attributes.value = obj.value;
  control.error = error;

  // console.log(JSON.stringify(schema, 0, 4));
  // console.log(JSON.stringify(error, 0, 4));
}
