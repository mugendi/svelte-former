<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { controlError } from "../../lib/utils";
  import Label from "../Label.svelte";
  import { currentField } from "../../lib/store";
  import FieldError from "./FieldError.svelte";
  export let control;
  export let validationErrors;
  export let controls;
  export let controlContainer;

  // select box must
  if (!Array.isArray(control.options)) {
    controlError(control, "Select Boxes must have an 'options' property which must be an array.");
  }

  function setValue() {
    currentField.update((o) => element.name);
    control._value = element.value;
  }

  let element;

  $: if (control.dynamicOptions) {
    // let d = control.options0[$currentField];
    let key = $currentField + "=" + control._value;
    let key2 = $currentField + "=*";
    let optObj;

    if (control.dynamicOptions[key] || control.dynamicOptions[key2]) {
      optObj = control.dynamicOptions[key] || control.dynamicOptions[key2];

      for (key in optObj) {
        for (let c of controls) {
          if (c.attributes.name == key) {
            c.options = [];
            if (Array.isArray(optObj[key])) {
              c.options = optObj[key];
            }
          }
        }
      }
    }
  }

  async function setDynamicOptions() {
    let key = $currentField + "=" + control._value;
    console.log({ key });
    // // console.log({ $currentField });
    // if (Array.isArray(control.dynamicOptions[key])) {
    //   // console.log(control.dynamicOptions[$currentField]);
    //   setDynamicOptions(control.dynamicOptions[key]);
    // }
    // if (opts == "function") {
    //   control.options = await opts();
    // } else {
    //   control.options = opts;
    // }

    control.options = ["we", "red"];
  }

  // onMount(setValue);
</script>

<!-- Input Label -->
<span class="element">
  <span class="label-container">
    <Label {control} />
    <FieldError {control} {validationErrors} />
  </span>

  <span bind:this={controlContainer}>
    <select
      this={control.element}
      bind:this={element}
      {...control.attributes}
      on:change={setValue}
      placeholder={control.attributes.placeholder && !control._value
        ? control.attributes.placeholder
        : null}
    >
      {#if control.attributes.placeholder}
        <option disabled selected value={null}>{control.attributes.placeholder}</option>
      {/if}
      {#each control.options as option}
        <option value={option.value || option}>{option.text || option}</option>
      {/each}
    </select>
  </span>
</span>
