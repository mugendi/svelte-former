<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { onMount } from "svelte";
  import Input from "./controls/Input.svelte";
  import Select from "./controls/Select.svelte";
  import Textarea from "./controls/Textarea.svelte";

  export let controls;
  export let control;
  export let values;
  export let validationErrors;

  let controlContainer;

  // trigger onchange event if value is set to ensure all methods called on:change are triggered
  function triggerInitialChange(element) {
    if (element.value) {
      setTimeout(() => {
        var event = new Event("change");
        // Dispatch it.
        element.dispatchEvent(event);
      }, 0);
    }
  }

  onMount(() => {
    if (controlContainer) {
      let controlEl = controlContainer.querySelector("input,select,textarea");
      triggerInitialChange(controlEl);
    }
  });
</script>

{#if control.element == "input"}
  <Input bind:control bind:values bind:validationErrors bind:controlContainer />
{:else if control.element == "textarea"}
  <Textarea bind:control bind:values bind:validationErrors bind:controlContainer />
{:else if control.element == "select"}
  <Select bind:control bind:values bind:validationErrors bind:controls bind:controlContainer />
{:else}
  <svelte:element this={control.element} {...control.attributes}>
    {control.attributes.value || ""}
  </svelte:element>
{/if}
