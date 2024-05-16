<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { merge } from "../lib/merge";
  // import { labelText } from "../lib/utils";
  export let control;
  export let id;
  export let label;
  export let cls = "svelte-former-label";


  label = merge(
    {
      text: typeof control.label == "object" ? control.label.text : control.label || null,
      attributes: {},
    },
    control.label || {}
  );

  // remove the for attribute if addad
  if (label.attributes && label.attributes.for) {
    delete label.attributes.for;
  }
</script>

{#if label.text}
  <label for={id || control.attributes.id} {...label.attributes} class={cls}>
    {@html label.text}
  </label>
{/if}
