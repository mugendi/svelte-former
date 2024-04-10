<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  // https://erikmonjas.github.io/css-grid-12-column-layout/
  import "./styles/12-column-css-grid.min.css";
  import "./styles/form.css";
  import Input from "./elements/Input.svelte";
  import TextArea from "./elements/TextArea.svelte";
  import Select from "./elements/Select.svelte";

  import v from "./lib/validator";
  import { capitalCase } from "./lib/change-case";

  export let inputs = [];
  export let onSubmit = function () {};

  const validationTypes = {
    date: "date",
    "datetime-local": "date",
    email: "email",
    number: "number",
    url: "url",
    password: "string",
    text: "string",
    color: "color",
    month: "month",
    time: "time",
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

  const schemaVals = [
    "min",
    "max",
    "enum",
    "length",
    "contains",
    "equal",
    "notEqual",
    "integer",
    "positive",
    "negative",
    "minProps",
    "maxProps",
    "alpha",
    "pattern",
    "alphanum",
    "alphadash",
    "hex",
    "singleLine",
    "base64",
    "lowercase",
    "uppercase",
    "localeLowercase",
    "localeUppercase",
    "padStart",
    "padEnd",
    "trimLeft",
    "trimRight",
    "trim",
    "normalize",
  ];

  let values = {};
  let hasError = false;
  let validation = {};
  let Components = {
    input: Input,
    textarea: TextArea,
    select: Select,
  };

  inputs = inputs.map((o, i) => {
    o = Object.assign(
      {
        id: "input-" + i,
        type: "text",
        element: "input",
        label: o.label || capitalCase(o.name || o.type || ""),
        // classes: ["input"],
      },
      o
    );

    return o;
  });

  $: if (v) {
    // validate
    let input;
    let schema = {};
    let key;

    for (let i in inputs) {
      input = inputs[i];

      key = input.name || input.id;

      let type = validationTypes[input.type] || "any";
      if (input.element !== "input" && input.type) {
        type = "string";
      }

      //
      schema[key] = {
        type,
        optional: input.required ? false : true,
        label: input.label.text || input.label || input.name || input.id,
        convert: true,
      };

      let v;
      for (let i in schemaVals) {
        v = schemaVals[i];
        if (input[v]) {
          schema[key][v] = input[v];
        }
      }

      // values
      values[key] = input.value;
    }

    const check = v.compile(schema);
    const validate = check(values);

    if (validate !== true) {
      validation = validate
        .map((o) => {
          return { [o.field]: o };
        })
        .reduce((a, b) => Object.assign(a, b));
    } else {
      validation = {};
    }

    hasError = Object.keys(validation).length > 0;

    // if (hasError) {
    //   console.error(
    //     "Correct form errors \n  - " +
    //       Object.values(validation)
    //         .map((o) => o.message)
    //         .join("\n  - ")
    //   );
    // }

    // console.log(JSON.stringify(schema, 0, 4));
    console.log(JSON.stringify(values, 0, 4));
  }

  function doSubmit() {
    if (hasError) {
      return;
    }

    if (typeof onSubmit == "function") {
      onSubmit(values);
    }
  }

  //   $: console.log(JSON.stringify(values,0,4));
</script>

<section class="section">
  <div class="container">
    <div class="">
      <form action="" on:submit|preventDefault={doSubmit}>
        {#if hasError}
          <div class="error">
            <h4>Form has errors!</h4>
            <p>Please correct the following errors to submit form.</p>
            <ol>
              {#each Object.values(validation) as error}
                <li>{error.message}</li>
              {/each}
            </ol>
          </div>
        {/if}
        <div class="form-fields grid-container">
          {#each inputs as input (input.name || input.id)}
            <svelte:element
              this={(input.wrap && input.wrap.element) ||
                (typeof input.wrap == "string" ? input.wrap : "div")}
              class="{(input.wrap && input.wrap.classes && input.wrap.classes.join(' ')) ||
                'col-xs-12'} {validation[input.name || input.id] ? 'input-error' : ''}"
              title={(validation[input.name || input.id] &&
                validation[input.name || input.id].message) ||
                null}
            >
              <label
                class="label {(input.label.classes && input.label.classes.join(' ')) || ''}"
                for={input.id}
              >
                {capitalCase(input.label.text || input.label)}
              </label>

              {#if input.element && Components[input.element]}
                <svelte:component
                  this={Components[input.element]}
                  {...input}
                  autocomplete={"autocomplete" in input
                    ? (input.autocomplete && input.autocomplete) || "off"
                    : null}
                  bind:value={input.value}
                  bind:selectedValue={input.selectedValue}
                />
              {/if}
            </svelte:element>
          {/each}

          <div class="field is-grouped">
            <div class="control">
              <button>Submit</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</section>

