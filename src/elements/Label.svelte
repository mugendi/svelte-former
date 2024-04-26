<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { labelText } from "../lib/utils.js";

  export let control;
  export let label;
  export let id;

  $: if (!label) {
    label = labelText(control);
  }
</script>


<label for={id || control.attributes.id}>{@html label}</label>


