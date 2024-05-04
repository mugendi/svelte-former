<!--
 Copyright (c) 2024 Anthony Mugendi

 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

# The Controls API

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