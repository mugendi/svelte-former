let controls = [
  // Simple text input
  {
    element: 'input',
    // add any valid html input attributes
    attributes: {
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
  },

  // Element with email validation
  {
    element: 'input',
    attributes: {
      name: 'email',
      value: 'NGURUMUGZ@GMAIL.COM',
    },
    classes: ['col-sm-12', 'col-md-6'],
    validation: {
      type: 'email',
      // Advanced validation rules can be applied -> https://github.com/icebob/fastest-validator?tab=readme-ov-file#email
      // Note that email is 'normalized' to lower case
      normalize: true,
    },
    // labels can also be objects with relevant html attributes
    label: {
      text: 'Email Address',
      attributes: {
        class: 'label',
      },
    },
  },

  //Radio Boxes
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

  {
    element: 'input',
    attributes: {
      type: 'radio',
      name: 'education',
      // you can pre-check a radio box by setting value
      value: 'Some College',
    },
    classes: ['col-sm-12', 'col-md-6'],
    // labels can also be strings
    label: 'Education Level',
    // Radio Boxes can also be an array of strings
    options: ['Some College', 'University'],
  },

  // Dynamic Select Boxes
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

    // dynamically affect other fields based on this field
    onChange: [
      {
        set: async function (value, update) {
          // console.log({ value });
          // Run only when a value is selected
          if (!value) {
            return;
          }

          // clear select box, disable, and use placeholder to update status
          update({
            city: {
              options: [],
              attributes: {
                disabled: true,
                placeholder: 'Loading Cities...',
              },
            },
          });

          // Fetch cities of that country from api
          let { data } = await scriptin.ajax
            .post('https://countriesnow.space/api/v0.1/countries/cities', {
              country: value,
            })
            .then((resp) => {
              return JSON.parse(resp.data);
            });

          // console.log(data);
          update({
            // update the city control
            city: {
              // set cities in options
              options: data,
              // enable any other attributes
              attributes: {
                disabled: false,
                placeholder: 'Select City',
              },
            },
          });
        },
      },
    ],
  },

  {
    element: 'select',
    attributes: {
      name: 'city',
      // you can have a field as disabled
      disabled: true,
      required: true,
    },
    classes: ['col-sm-12', 'col-md-6'],
    label: 'City',
    // start with an empty object
    options: [],
  },

  // Even rich textboxes are allowed
  {
    element: 'richtext',
    attributes: {
      name: 'bio',
      required: true,
    },
    classes: ['col-sm-12'],
    // labels can also be strings
    label: 'Bio',
    validation: {
      type: 'string',
      // set a minimum number of characters
      min: 20,
    },
  },

  // Checkbox
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
  },
];

// Buttons
let buttons = [
  {
    text: 'Submit',
    // without this method, the form is submitted if there are no errors
    onClick: function (event, { form, errors, values, controls }) {
      // Prevent Default
      event.preventDefault();

      let submitEl = document.querySelector('#submit-data');
      let dataEl = submitEl.querySelector('code');


      // delete submitData.
      const html = Prism.highlight(
        JSON.stringify({errors, values}, 0, 4),
        Prism.languages.javascript,
        'javascript'
      );

      dataEl.innerHTML = html;
    },
  },
  {
    text: 'Just a Button',
    // html attributes
    attributes: {
      type: 'button',
    },
    // called when button is clicked
    onClick: function (event, data) {
      // data = {form, errors, values}
      alert(JSON.stringify(data.values, 0, 4));
    },
  },
];

let s = new SvelteFormer({
  target: document.getElementById('form'),
  onSubmit: function (e) {
    console.log(e);
  },
  props: {
    controls,
    buttons,
    // form action
    action: '',
    // form submit post
    method: 'post',
  },
});
