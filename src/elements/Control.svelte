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
  import { Errors, currentControl } from "../lib/store";
  import RichText from "./controls/RichText.svelte";
  import AutoComplete from "./controls/AutoComplete.svelte";

  export let control;

  let type;

  $: if (control) {
    control.required = control.required || (control.attributes.required ? true : false);

    // if is a form input and not other element
    if (formInputTypes.indexOf(control.element) > -1) {
      type = "type-" + control.attributes.type + " type-" + control.element;
    }

    if (control.creationMethod == "dynamic") {
      // validate value...
      validateValue(control);
    }
  }

  let timeoutInt;

  function onChange(e, val, element) {
    let value;

    clearTimeout(timeoutInt);

    timeoutInt = setTimeout(() => {
      // console.log({ e, val, element });
      if (e) {
        let el = e.target;
        element = el.tagName.toLowerCase();

        type = el.type;

        if (el.type == "checkbox") {
          value = el.checked;
        } else {
          value = el.value;
        }
      } else {
        type = control.attributes.type;
        value = val;
      }

      // console.log({ type, value });

      control.attributes.value = value;
      validateValue(control);

      currentControl.update((o) => control);

      let errors = Object.assign({}, $Errors);

      if (control.error) {
        errors[control.attributes.name] = control.error;
      } else {
        delete errors[control.attributes.name];
      }

      //
      Errors.update((o) => errors);
    }, 0);
  }

  // run onChange if there is a value passed on creation
  onMount(function () {
    // if (control.attributes && ("value" in control.attributes || control.attributes.required)) {
    //  console.log(JSON.stringify(control,0,4));
    setTimeout(() => {
      onChange(null, control.attributes.value, control.element);
    }, 1);
    // }
  });

</script>

<div
  class="{control.classes.join(' ')} {control.attributes.type == 'hidden'
    ? 'svelte-former-hidden'
    : ''}"
>
  <div
    class="svlete-former-control-group{control.error ? ' svelte-former-has-error' : ''} {type ||
      ' content'} "
  >
    {#if control.element == "input"}
      <Input bind:control {onChange} />
    {:else if control.element == "select"}
      <Select bind:control {onChange} />
    {:else if control.element == "textarea"}
      <Textarea bind:control {onChange} />
    {:else if control.element == "richtext"}
      <RichText bind:control {onChange} />
    {:else if control.element == "autocomplete"}
      <AutoComplete bind:control {onChange} />
    {:else}
      <svelte:element this={control.element} bind:this={control.node} {...control.attributes}>
        {@html control.content}
      </svelte:element>
    {/if}
  </div>
</div>
