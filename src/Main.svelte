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
  import "./styles/grid.scss";
  import "./styles/form.scss";
  import { merge } from "./lib/merge";
  import {
    controlSchema,
    validationError,
    buttonSchema,
    validationTypes,
    v,
  } from "./lib/validator";
  import { capitaliseWord } from "./lib/utils";
  import Control from "./elements/Control.svelte";
  import { onMount, afterUpdate } from "svelte";
  import Button from "./elements/controls/Button.svelte";
  import { currentField } from "./lib/store";

  export let controls = [];
  export let onSubmit = function () {};
  export let buttons = [{ text: "Submit", attributes: { type: "submit" }, css: { color: "red" } }];

  let values = {};
  let validationCheck;
  let validationErrors = {};
  let isReady = false;
  let formEl;

  // if controls
  $: if (formEl && controls.length > 0) {
    let check = v.compile(controlSchema);
    let validate = check(controls);

    // validate schema first
    if (validate !== true) {
      throw new Error("Correct the following errors: \n  " + validationError(validate));
    }

    check = v.compile(buttonSchema);
    validate = check(buttons);

    if (validate !== true) {
      throw new Error("Correct the following button errors: \n  " + validationError(validate));
    }

    controls = controls.map((o, i) => {
      o = merge(
        {
          idx: i,
          label: o.attributes.name ? capitaliseWord(o.attributes.name) : "",
          attributes: {
            id: "control-" + (i + 1),
          },
        },
        o
      );

      return o;
    });

    // ensure unique ids
    let ids = controls.map((o) => o.attributes.id);
    let idsObj = {};
    for (let id of ids) {
      if (id in idsObj) {
        throw new Error("Input Ids must be unique! " + '"' + id + '" is repeated!');
      }
      idsObj[id] = true;
    }
  }

  //
  $: {
    // console.log({$currentField , s:"ffff"});
    for (let control of controls) {
      if ($currentField === control.attributes.name) {
        validate(control);
      }
    }
  }

  function validate(control) {
    // console.log(JSON.stringify({ control }, 0, 4));

    if (!formEl) {
      return;
    }

    if (["input", "textarea", "select"].indexOf(control.element) == -1) {
      return;
    }

    let schema = {};
    let schemaObj = { type: validationTypes[control.attributes.type] || "any" };

    if (control.validate) {
      schemaObj = control.validate;
    }

    schemaObj.optional = true;
    schemaObj.convert = true;
    schemaObj.label = control.label.text || control.label;

    let sel = '[name="' + control.attributes.name + '"]';
    // console.log(control.attributes.name, formEl, sel);
    // document.querySelector
    let el = formEl.querySelector(sel);

    if (el && el.value) {
      control._value = el.value;
    }

    // radio input
    if (control.attributes.type !== "radio" && control._value !== undefined) {
      control.attributes.value = control._value || control.attributes.value;
    }

    // ensure checkbox
    if (control.attributes.type == "checkbox") {
      schemaObj.type = "string";

      // if required, must be true
      if (control.attributes.required) {
        schemaObj.enum = ["true"];
      } else {
        schemaObj.enum = ["true", "false"];
      }
    }

    if (["email", "url"].indexOf(schemaObj.type) > -1) {
      schemaObj.normalize = true;
    }

    // ensure required
    if (control.attributes.required && schemaObj.optional) {
      delete schemaObj.optional;
    }

    schema[control.attributes.name] = schemaObj;

    validationCheck = v.compile(schema);

    // console.log({ c: control._value });

    values[control.attributes.name] = control._value || control.attributes.value || "";

    // console.log(JSON.stringify({ schema, values, validationErrors }, 0, 4));

    // validationErrors = {};
    let isValid = validationCheck(values);
    if (isValid !== true) {
      control.hasError = true;
      // validationErrors.fields = isValid.map((o) => o.field);
      for (let i in isValid) {
        validationErrors[isValid[i].field] = isValid[i].message;

        if (isValid[i].expected) {
          validationErrors[isValid[i].field] =
            (control.validate && control.validate.message) ||
            validationErrors[isValid[i].field] + " Expected: " + isValid[i].expected;
        }
      }
    } else {
      control.hasError = false;
      delete validationErrors[$currentField];
    }

    validationErrors = validationErrors;
  }

  function wrapElement(control) {
    return (
      (control.wrap && control.wrap.element) ||
      (typeof control.wrap == "string" ? control.wrap : "div")
    );
  }

  function wrapClasses(control) {
    if (control.attributes.type == "hidden") {
      return "hidden";
    }
    return (control.wrap && control.wrap.classes && control.wrap.classes.join(" ")) || "cell-sm-12";
  }

  function doSubmit() {
    // console.log(JSON.stringify(values,0,4));
    for (let control of controls) {
      validate(control);
    }

    if (Object.values(validationErrors).length > 0) {
      // throw.error(validationErrors);
      return;
    }

    if (typeof onSubmit == "function") {
      onSubmit(values, { method: "POST" });
    }
  }

  afterUpdate(() => {
    values = {};
  });

  onMount(async () => {
    isReady = true;
  });
</script>

<form class="former row" action="" on:submit|preventDefault={doSubmit} bind:this={formEl}>
  <div class="form-fields row">
    {#each controls as control}
      <div class="control-group {wrapClasses(control)}">
        <svelte:element
          this={wrapElement(control)}
          class="{validationErrors[control.attributes.name] ? 'has-error' : ''}  "
        >
          <!-- Actual Control -->

          <Control bind:control bind:validationErrors bind:controls />
        </svelte:element>
      </div>
    {/each}
  </div>

  <div class="control-group controls">
    <div class="element">
      {#each buttons as button}
        <Button {button} />
      {/each}
    </div>
  </div>
</form>

<style>
</style>
