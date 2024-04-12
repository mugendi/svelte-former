<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import Input from "./controls/Input.svelte";
  import Select from "./controls/Select.svelte";
  import Textarea from "./controls/Textarea.svelte";

  export let controls;
  export let control;
  export let values;
  export let validationErrors;
</script>

{#if control.element == "input"}
  <Input bind:control bind:values bind:validationErrors />
{:else if control.element == "textarea"}
  <Textarea bind:control bind:values bind:validationErrors />
{:else if control.element == "select"}
  <Select bind:control bind:values bind:validationErrors bind:controls />
{:else}
  <svelte:element this={control.element} {...control.attributes}>
    {control.attributes.value || ""}
  </svelte:element>
{/if}
