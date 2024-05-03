# Docs

First create an array of all form control.

```javascript
// create an array of controls
let controls = [
  {
    element: 'input',
    // add any valid html input attributes
    attributes: {
      name: 'firstName',
      required: true,
    },
    // bootstrap column classes to position inputs
    classes: ['col-sm-12', 'col-md-6'],
    // validation based on https://github.com/icebob/fastest-validator
    validation: {
      type: 'string',
    },
    label: 'First Name',
  },
];
```

Each form control is an object with the following properties `element, attributes, label, validation, options, content, classes, onChange` [Read More](/docs/svelte-former/control) .


## Vanilla Javascript / HTML

```html
<!-- Target element -->
<div id="form"></div>

<!-- Add Script -->
<script src=".../build/svelte-former.js">

  <script>
    // controls
    let controls = [...];

    // initialize form
    let s = new SvelteFormer({
      // target element
      target: document.getElementById('form'),
      // props
      props: {
        controls,
        // form action
        action: '',
        // form submit post
        method: 'post',
      },
    });
</script>
```

## Svelte

First install with `yarn add svelte-former`.

```javascript

import Former from 'svelte-former';

// controls
let controls = [...];

// Svelte Component
<Former {controls} action= '' method= 'post' />

```

<script>

  document.querySelector('title').innerText = "Docs"
  document.querySelector('h1:first-child').remove()

</script>
