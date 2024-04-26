<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { onMount } from "svelte";
  import { validateValue } from "../lib/validation";
  import Input from "./controls/Input.svelte";
  import Select from "./controls/Select.svelte";
  import Textarea from "./controls/Textarea.svelte";
  import { formInputTypes } from "../lib/utils";
  import { currentControl } from "../lib/store";

  export let control;
  export let idx;

  let type;

  $: {
    if (formInputTypes.indexOf(control.element) > -1) {
      type = control.attributes.type || control.element;
    }
  }

  function onChange(e, val) {
    let value;

    if (e) {
      let el = e.target;
      if (el.type == "checkbox") {
        value = el.checked;
      } else {
        value = el.value;
      }
    } else {
      value = val;
    }

    control.attributes.value = value;
    validateValue(control, idx);

    currentControl.update((o) => control);

  }

  // run onChange if there is a value passed on creation
  onMount(function () {
    if (control.attributes && ("value" in control.attributes || control.attributes.required)) {
      setTimeout(() => {
        onChange(null, control.attributes.value);
      }, 1);
    }
  });
</script>

<div class={control.classes.join(" ")}>
  <div class="control-group{control.error ? ' has-error' : ''} {type || ' content'} ">
    {#if control.element == "input"}
      <Input bind:control {onChange} />
    {:else if control.element == "select"}
      <Select bind:control {onChange} />
    {:else if control.element == "textarea"}
      <Textarea bind:control {onChange} />
    {:else}
      <svelte:element this={control.element}>
        {@html control.content}
      </svelte:element>
    {/if}
  </div>
</div>
