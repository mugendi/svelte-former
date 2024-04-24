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

  // onMount(setValue);
</script>

<!-- Input Label -->
<span class="element">
  <span class="label-container">
    <Label bind:control />
    <FieldError {control} {validationErrors} />
  </span>

  <span bind:this={controlContainer}>
    <select
      this={control.element}
      bind:this={element}
      {...control.attributes}
      on:change={setValue}
      placeholder={control.attributes.placeholder && !control._value && !control.attributes.value
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
