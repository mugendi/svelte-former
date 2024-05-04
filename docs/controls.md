<!--
 Copyright (c) 2024 Anthony Mugendi

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

# Type of Controls

## Input
```javascript
  {
    element: 'input',
    // add any valid html input attributes
    attributes: {
      type:'text',
      name: 'firstName',
      // min, max, minlength & maxlength are automatically applied to validation
      min: '4',
      // notice the error until a valid value is added
      required: true,
    },
    // bootstrap column classes to position inputs
    classes: ['col-sm-12', 'col-md-6'],
    // validation based on https://github.com/icebob/fastest-validator
    validation: {
      type: 'string',
    },
    // add label. HTML code can be used
    label: '<i>First Name</i>',
  }
```

## Radio Box
```javascript
  {
    element: 'input',
    attributes: {
      type: 'radio',
      name: 'gender',
      // sometimes a field can be optional
      required: true,
    },
    classes: ['col-sm-12', 'col-md-6'],
    // labels can also be objects with relevant html attributes
    label: {
      text: 'Gender',
      attributes: {
        class: 'label',
      },
    },
    // Radio Boxes must have an options Object
    options: [
      { text: 'Male', value: 'male' },
      { text: 'Female', value: 'female' },
    ],
  },
```

## Check Box
```javascript
  {
    element: 'input',
    attributes: {
      type: 'checkbox',
      name: 'terms',
      // sometimes a field can be optional
      required: true,
    },
    classes: ['col-sm-12', 'col-md-6'],
    // labels can also be strings
    label: 'Accept Terms',
  }
```

## Select
```javascript
 {
    element: 'select',
    attributes: {
      name: 'country',
      required: true,
      // You can have a placeholder
      placeholder: 'Select Country',
    },
    classes: ['col-sm-12', 'col-md-6'],
    label: 'Country',
    options: ['Kenya', 'Nigeria', 'Canada', 'Australia'],
 }
```

## Autocomplete Control

```javascript
  {
    element:"autocomplete",
    options:["German Shepherd","Japanese Spitz", "Poodle", "Maltese", "Havanese"],
    attributes:{
      name:'dog-breed',
      placeholder:"Enter Favourite Dog Breed"
    },
    label:"Dog Breed"
  },
```

## Dynamic Control

```javascript
 // First password field
 {
    element: 'input',
    attributes: {
      type: 'password',
      name: 'password',
    },
    classes: ['col-sm-12', 'col-md-6'],
    validation: {
      type: 'string',
      // password should ne at least 6 characters
      min: 6,
      // check password strength. Regex from: https://stackoverflow.com/a/70924394/1462634
      pattern:
        /^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*[\d|@#$!%*?&])[\p{L}\d@#$!%*?&]{6,}$/gmu,
      // Custom error message
      message:
        ' <strong>Password too weak.</strong> Mix lowercase, uppercase, special characters and numbers',
    },
    label: 'Password',
    onChange: [
      {
        set: function (error, value, update) {
          // if error or no value
          if (error || !value) {
            return;
          }
          // update confirmPass control
          update({
            confirmPass: {
              attributes: { disabled: false },
              validation: {
                // ensure passwords match
                enum: [value],
                // custom error message
                message: 'Passwords do not match!',
              },
            },
          });
        },
      },
    ],
  }
  
 // Dynamic field updated after password field is set
  {
    element: 'input',
    attributes: {
      type: 'password',
      name: 'confirmPass',
      required: true,
      // start with a disabled field
      disabled: true,
      autocomplete: 'off',
    },
    options: [],
    classes: ['col-sm-12', 'col-md-6'],
    label: 'Repeat Password',
  },
```


# The Controls Object (API)

Controls/Form Inputs are created via an object with the following format:

```javascript
{
    element: 'input',
    attributes: {
        type:'radio',
        name: 'gender',
    },
    classes: ['col-sm-12', 'col-md-6'],
    validation: {
        type: 'string',
    },
    label: 'Gender',
    options:['Male', 'Female']
}
```

To ensure you enter a correctly formatted object, all controls are validated against [This Schema](./control-schema.md).

## `element`

Determines the typr of form element to be created. Should be one of : `'input', 'textarea', 'select', 'richtext', 'div', 'hr', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'`.

## `attributes`

All allowed form element attributes. The `name` attribute is compulsory and must be unique across all elements.

## `label`

The `<label>` element.

The label property can be an array of strings or an object.

```javascript

{
    ...
    label: "Gender"
}

// Or

{
    ...
    label: {
        text:"Gender",
        attributes:{
            class:"label text-centered"
        }
    }
}


```

## `classes`

The `classes` property is used to add classes to the `div elements` that contain the controls.

By default, **Svelte-Former** uses a [12-column grid](../src//styles/grid.scss) extracted from [Bootstrap](https://getbootstrap.com/). You can thus use column classes such as `col-sm-12', 'col-md-6'` to style and position form controls on the grid.

## `validation`

Can contain any [fastest-validator](https://www.npmjs.com/package/fastest-validator) schema. For example:

```javascript

// Email form control
{
    element: 'input',
    attributes: {
        type:'email',
        name: 'email-address',
    },
    classes: ['col-sm-12', 'col-md-6'],
    validation: {
        type: 'email',
    },
    label: 'Email Address'
}

// Email advanced password field to ensure
{
    element: 'input',
    attributes: {
        type:'password',
        name: 'password',
    },
    classes: ['col-sm-12', 'col-md-6'],
    validation: {
        type: "string",
        min:6,
        //pattern to check password strength
        pattern: /^(?=.*\p{Ll})(?=.*\p{Lu})(?=.*[\d|@#$!%*?&])[\p{L}\d@#$!%*?&]{6,}$/gmu,
        // custom error message
        message:
          " <strong>Password too weak.</strong> Mix lowercase, uppercase, special characters and numbers",
    },
    label: 'Password'
}

```

## `options`

A list of values to be added as select `<options>` or values for radio boxes.

The options property can be an array of strings or an object.

```javascript

{
    ...
    options:["Male", "Female"]
}

// Or

{
    ...
    options:[
        {value:"male", text:"Male"},
        {value:"female", text:"Female"}
    ]
}


```

## `onChange`

This parameter is used to change other fields dynamically. It is triggered whenever the field changes (hence the name).

```javascript
{
    element: 'select',
    attributes: {
      name: 'country',
    },
    classes: ['col-sm-12', 'col-md-6'],
    options:['Kenya','Uganda'],
    label: 'Country',
    onChange: [
      {
        // When value is "Kenya"
        value:"Kenya"
        // set. Can be a function or object
        set: {
          // the control named 'city' (select box)
          city: {
            // set options of cities in Kenya
            options:['Nairobi','Nakuru','Nyeri']
          },
        },
      },
    ],
  }

```

Note: All attributes of another control other than `'element' and 'name'` can be updated dynamically.

See [example](https://mugendi.github.io/docs/svelte-former/) for advanced usage.
