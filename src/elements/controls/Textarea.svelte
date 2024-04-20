<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { currentField } from "../../lib/store";
  import Label from "../Label.svelte";
  import FieldError from "./FieldError.svelte";
  export let control;
  export let validationErrors;
  export let controlContainer;

  let element;

  function setValue() {
    currentField.update((o) => element.name);
    control._value = element.value;
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
    <textarea
      this={control.element}
      bind:this={element}
      {...control.attributes}
      on:keyup={setValue}
      on:change={setValue}
    />
  </span>
</span>
